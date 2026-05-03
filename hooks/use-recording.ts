'use client'

import { useState, useRef, useCallback } from 'react'
import { startRecording, stopRecording } from '@/app/actions/meetings'

export type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'stopping'

export interface LiveSegment {
  id: string
  speaker: string
  content: string
  startMs: number
  isFinal: boolean
}

async function getUserTranscriptionLanguage(): Promise<string> {
  try {
    const response = await fetch('/api/user/language-preferences')
    if (response.ok) {
      const data = await response.json()
      return data.transcriptionLanguage || 'auto'
    }
  } catch (error) {
    console.error('Failed to get user language preference:', error)
  }
  return 'auto'
}

// ─── Deepgram response types ────────────────────────────────────────────────

interface DGWord {
  word: string
  punctuated_word?: string
  start: number
  end: number
  confidence: number
  speaker: number
  speaker_confidence?: number
  _channel?: number // 0 = local mic ("You"), 1 = remote/system audio
}

interface DGResult {
  type: 'Results'
  channel_index?: [number, number] // [thisChannel, totalChannels]
  is_final: boolean
  speech_final: boolean
  start: number
  duration: number
  channel: {
    alternatives: [{
      transcript: string
      confidence: number
      words: DGWord[]
    }]
  }
}

// ─── Hallucination filter ────────────────────────────────────────────────────

const HALLUCINATIONS = new Set([
  'thank you.',
  'thanks.',
  'thanks for watching.',
  'thank you for watching.',
  'thank you very much.',
  'thanks for listening.',
  'you',
  'you.',
  '.',
  '...',
  'bye.',
  'bye-bye.',
  'the end.',
  'subscribe.',
  'like and subscribe.',
  'please subscribe.',
])

function isHallucination(text: string): boolean {
  const t = text.trim().toLowerCase()
  return !t || t.length <= 2 || HALLUCINATIONS.has(t)
}

// ─── WAV encoder ─────────────────────────────────────────────────────────────

function encodeWAV(chunks: Int16Array[], sampleRate: number, numChannels: number): Blob {
  const totalSamples = chunks.reduce((acc, c) => acc + c.length, 0)
  const combined = new Int16Array(totalSamples)
  let offset = 0
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }
  const byteLen = combined.byteLength
  const buf = new ArrayBuffer(44 + byteLen)
  const v = new DataView(buf)
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + byteLen, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, numChannels, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numChannels * 2, true); v.setUint16(32, numChannels * 2, true)
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, byteLen, true)
  new Int16Array(buf, 44).set(combined)
  return new Blob([buf], { type: 'audio/wav' })
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRecording({ meetingId }: { meetingId: string }) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [reDiarizing, setReDiarizing] = useState(false)

  const micStreamRef = useRef<MediaStream | null>(null)     // local mic — always captured
  const displayStreamRef = useRef<MediaStream | null>(null) // system/tab audio — remote participants
  const wsRef = useRef<WebSocket | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const segCountRef = useRef(0)
  const isActiveRef = useRef(false)
  // Per-channel interim segment IDs: channel 0 = mic ("You"), channel 1 = remote
  const interimIdRef = useRef<Record<number, string | null>>({ 0: null, 1: null })
  const audioChunksRef = useRef<Int16Array[]>([])
  const tokenRef = useRef<string>('')
  const nChannelsRef = useRef(1)

  function getRmsLevel(): number {
    const analyser = analyserRef.current
    if (!analyser) return 0
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i] - 128
      sum += x * x
    }
    return Math.sqrt(sum / buf.length) / 128
  }

  // ── Process a Deepgram result message ──────────────────────────────────────

  const processResult = useCallback((result: DGResult) => {
    const alt = result.channel.alternatives[0]
    if (!alt) { console.warn('[processResult] no alternative in result'); return }
    const transcript = alt.transcript.trim()

    if (!transcript) { console.log('[processResult] empty transcript, skipping'); return }
    if (isHallucination(transcript)) { console.log(`[processResult] hallucination filtered: "${transcript}"`); return }

    const chunkStartMs = Math.round(result.start * 1000)
    const channelIdx = result.channel_index?.[0] ?? 0
    const isLocalMic = channelIdx === 0 && nChannelsRef.current === 2
    const totalChannels = nChannelsRef.current

    console.log(`[processResult] ch=${channelIdx}/${totalChannels} is_final=${result.is_final} isLocalMic=${isLocalMic} words=${alt.words?.length ?? 0} text="${transcript.slice(0, 60)}"`)

    if (!result.is_final) {
      const rawSpeaker = alt.words?.[0]?.speaker ?? 0
      const speakerLabel = isLocalMic ? 'You' : `Speaker ${rawSpeaker + 1}`
      const interimId = interimIdRef.current[channelIdx] ?? `interim-ch${channelIdx}-${chunkStartMs}`
      interimIdRef.current[channelIdx] = interimId
      setLiveSegments((prev) => [
        ...prev.filter((s) => s.id !== interimId),
        { id: interimId, speaker: speakerLabel, content: transcript, startMs: chunkStartMs, isFinal: false },
      ])
      return
    }

    // Final — clear interim for this channel, split into per-speaker segments
    const currentInterimId = interimIdRef.current[channelIdx]
    interimIdRef.current[channelIdx] = null
    setLiveSegments((prev) => prev.filter((s) => s.id !== currentInterimId))

    if (!alt.words?.length) { console.warn('[processResult] final result has no words'); return }

    // Log unique speakers found in this final result
    const uniqueSpkrs = [...new Set(alt.words.map(w => w.speaker))]
    console.log(`[processResult] final — unique speakers in chunk: [${uniqueSpkrs.join(', ')}]`)

    const segments: LiveSegment[] = []
    let buffer = ''
    let bufferStart = alt.words[0].start
    let currentSpeaker = alt.words[0].speaker

    for (const w of alt.words) {
      const text = w.punctuated_word ?? w.word
      if (w.speaker !== currentSpeaker) {
        if (buffer.trim()) {
          segments.push({
            id: `seg-${++segCountRef.current}`,
            speaker: isLocalMic ? 'You' : `Speaker ${currentSpeaker + 1}`,
            content: buffer.trim(),
            startMs: Math.round(bufferStart * 1000),
            isFinal: true,
          })
        }
        buffer = text
        bufferStart = w.start
        currentSpeaker = w.speaker
      } else {
        buffer += (buffer ? ' ' : '') + text
      }
    }
    if (buffer.trim()) {
      segments.push({
        id: `seg-${++segCountRef.current}`,
        speaker: isLocalMic ? 'You' : `Speaker ${currentSpeaker + 1}`,
        content: buffer.trim(),
        startMs: Math.round(bufferStart * 1000),
        isFinal: true,
      })
    }

    if (!segments.length) { console.warn('[processResult] final — produced 0 segments after grouping'); return }
    console.log(`[processResult] final — produced ${segments.length} segment(s):`, segments.map(s => `${s.speaker}: "${s.content.slice(0, 40)}"`))
    setLiveSegments((prev) => [...prev, ...segments])

    for (const seg of segments) {
      fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          speaker: seg.speaker,
          content: seg.content,
          startMs: seg.startMs,
          endMs: seg.startMs + Math.round(result.duration * 1000),
        }),
      }).catch((e) => console.error('[Transcript save]', e))
    }
  }, [meetingId])

  // ── Start ──────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (isActiveRef.current) return

    setError(null)
    setStatus('requesting')
    setLiveSegments([])
    setAudioLevel(0)
    segCountRef.current = 0
    interimIdRef.current = { 0: null, 1: null }
    audioChunksRef.current = []

    try {
      const userLanguage = await getUserTranscriptionLanguage()

      console.log(`[Recording] language pref: ${userLanguage}`)

      const tokenRes = await fetch('/api/deepgram-token')
      if (!tokenRes.ok) throw new Error('Could not create Deepgram session')
      const { token: deepgramToken } = await tokenRes.json()
      tokenRef.current = deepgramToken
      console.log('[Recording] Deepgram token acquired')

      // Always capture mic — this is the local speaker ("You"), always perfectly isolated
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
        video: false,
      })
      micStreamRef.current = micStream

      // Try to capture system/tab audio — remote participants (mixed, but separate from local mic)
      let displayStream: MediaStream | null = null
      if (typeof navigator?.mediaDevices?.getDisplayMedia === 'function') {
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false })
          displayStreamRef.current = displayStream
        } catch (e) {
          console.warn('[Audio] System audio capture declined — mic-only mode. Reason:', e)
        }
      }

      const nChannels = displayStream ? 2 : 1
      nChannelsRef.current = nChannels
      console.log(`[Audio] mode: ${nChannels === 2 ? 'DUAL — ch0=mic(You) + ch1=system(remote)' : 'MIC ONLY — no system audio, diarization will be single-channel'}`)
      if (nChannels === 1) console.warn('[Audio] Single channel mode: Deepgram must separate speakers from one mixed stream — accuracy limited')

      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = audioCtx

      const micSource = audioCtx.createMediaStreamSource(micStream)

      // Analyser always on mic for accurate local level metering
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      micSource.connect(analyser)
      analyserRef.current = analyser

      let processorInput: AudioNode

      if (displayStream) {
        // Merge mic (ch0) and display audio (ch1) into a 2-channel stream
        const displaySource = audioCtx.createMediaStreamSource(displayStream)
        const merger = audioCtx.createChannelMerger(2)
        micSource.connect(merger, 0, 0)     // mic mono → channel 0
        displaySource.connect(merger, 0, 1) // display ch0 → channel 1 (downmix to mono)
        processorInput = merger
      } else {
        processorInput = micSource
      }

      const DEEPGRAM_NATIVE = new Set(['en', 'hi', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'sv', 'pl', 'tr', 'id', 'uk', 'ar'])
      const dgLanguage = userLanguage === 'auto'
        ? 'multi'
        : DEEPGRAM_NATIVE.has(userLanguage) ? userLanguage : 'multi'

      const dgUrl = 'wss://api.deepgram.com/v1/listen' +
        '?model=nova-3' +
        '&diarize=true' +
        `&language=${dgLanguage}` +
        '&punctuate=true' +
        '&smart_format=true' +
        '&interim_results=true' +
        '&utterance_end_ms=1000' +
        '&vad_events=true' +
        '&encoding=linear16' +
        '&sample_rate=16000' +
        `&channels=${nChannels}` +
        (nChannels === 2 ? '&multichannel=true' : '')

      console.log('[Deepgram] WS URL params:', dgUrl.split('?')[1])

      const ws = new WebSocket(dgUrl, ['token', deepgramToken])
      wsRef.current = ws

      ws.onopen = () => console.log('[Deepgram] WebSocket open — streaming started')

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string)
          if (data.type === 'Results') {
            const alt = data.channel?.alternatives?.[0]
            const words = alt?.words ?? []
            const chIdx = data.channel_index?.[0] ?? 0
            const speakerMap = words.map((w: DGWord) => `${w.speaker ?? '?'}:${w.word}`).join(' ')
            console.log(`[DG] ch=${chIdx} is_final=${data.is_final} | ${speakerMap || alt?.transcript}`)
            processResult(data as DGResult)
          } else {
            console.log('[DG] event:', data.type, data)
          }
        } catch (e) {
          console.error('[Deepgram] parse error', e)
        }
      }

      ws.onerror = (e) => console.error('[Deepgram] WebSocket error', e)
      ws.onclose = (e) => console.log('[Deepgram] WebSocket closed', e.code, e.reason)

      // eslint-disable-next-line deprecation/deprecation
      const processor = audioCtx.createScriptProcessor(4096, nChannels, nChannels)
      processorInput.connect(processor)
      processor.connect(audioCtx.destination)

      processor.onaudioprocess = (e) => {
        if (!isActiveRef.current || ws.readyState !== WebSocket.OPEN) return
        const samplesPerChannel = e.inputBuffer.length
        const i16 = new Int16Array(samplesPerChannel * nChannels)
        for (let ch = 0; ch < nChannels; ch++) {
          const f32 = e.inputBuffer.getChannelData(ch)
          for (let i = 0; i < samplesPerChannel; i++) {
            const s = Math.max(-1, Math.min(1, f32[i]))
            i16[i * nChannels + ch] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
        }
        ws.send(i16.buffer)
        audioChunksRef.current.push(i16)
      }
      processorRef.current = processor

      await startRecording(meetingId)

      startTimeRef.current = Date.now()
      isActiveRef.current = true
      setStatus('recording')

      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      levelTimerRef.current = setInterval(() => {
        setAudioLevel(getRmsLevel())
      }, 80)

      // If either stream ends (e.g. user stops screen share), stop recording
      const handleTrackEnd = () => { if (isActiveRef.current) stop() }
      micStream.getTracks()[0]?.addEventListener('ended', handleTrackEnd)
      displayStream?.getTracks()[0]?.addEventListener('ended', handleTrackEnd)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes('not-allowed') || msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Microphone access denied. Click the mic icon in the address bar to allow it.'
          : msg
      )
      setStatus('idle')
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      displayStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [meetingId, processResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    if (!isActiveRef.current) return
    isActiveRef.current = false
    setStatus('stopping')
    setAudioLevel(0)

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const savedChannels = nChannelsRef.current
    const savedToken = tokenRef.current

    if (timerRef.current) clearInterval(timerRef.current)
    if (levelTimerRef.current) { clearInterval(levelTimerRef.current); levelTimerRef.current = null }

    const processor = processorRef.current
    if (processor) {
      processor.disconnect()
      processor.onaudioprocess = null
    }
    processorRef.current = null

    setTimeout(() => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'CloseStream' }))
        ws.close()
      }
      wsRef.current = null
    }, 500)

    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null

    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    displayStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    displayStreamRef.current = null

    const chunks = audioChunksRef.current
    audioChunksRef.current = []

    // Don't await — let DB write happen in background so UI unblocks immediately
    stopRecording(meetingId, durationSeconds).catch((e) => console.error('[stopRecording]', e))
    setStatus('idle')
    setElapsedSeconds(0)

    fetch('/api/ai/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    }).catch((e) => console.error('[AI enhance]', e))

    // Batch re-diarization with multichannel support
    if (chunks.length === 0) {
      console.warn('[BatchDiarize] no audio chunks recorded — skipping')
    } else if (!savedToken) {
      console.error('[BatchDiarize] no Deepgram token — cannot re-diarize')
    } else {
      setReDiarizing(true);
      (async () => {
        try {
          console.log(`[BatchDiarize] START — ${chunks.length} chunks, ${savedChannels}ch, meetingId=${meetingId}`)
          const wav = encodeWAV(chunks, 16000, savedChannels)
          console.log(`[BatchDiarize] WAV encoded — size: ${(wav.size / 1024 / 1024).toFixed(2)} MB, duration: ~${(chunks.length * 4096 / 16000).toFixed(1)}s`)

          const batchUrl = 'https://api.deepgram.com/v1/listen' +
            '?model=nova-3' +
            '&diarize=true' +
            '&punctuate=true' +
            '&smart_format=true' +
            `&channels=${savedChannels}` +
            (savedChannels === 2 ? '&multichannel=true' : '')

          console.log(`[BatchDiarize] sending to Deepgram — params: ${batchUrl.split('?')[1]}`)

          const dgRes = await fetch(batchUrl, {
            method: 'POST',
            headers: { Authorization: `Token ${savedToken}`, 'Content-Type': 'audio/wav' },
            body: wav,
          })

          if (!dgRes.ok) {
            const errText = await dgRes.text()
            throw new Error(`Deepgram batch ${dgRes.status}: ${errText}`)
          }

          const dgData = await dgRes.json()
          const channelsReturned = dgData.results?.channels?.length ?? 0
          console.log(`[BatchDiarize] Deepgram responded — channels returned: ${channelsReturned}`)

          let words: DGWord[] = []

          if (savedChannels === 2 && channelsReturned >= 2) {
            const ch0 = (dgData.results.channels[0]?.alternatives?.[0]?.words ?? []).map((w: DGWord) => ({ ...w, _channel: 0 }))
            const ch1 = (dgData.results.channels[1]?.alternatives?.[0]?.words ?? []).map((w: DGWord) => ({ ...w, _channel: 1 }))
            const ch0Speakers = [...new Set(ch0.map((w: DGWord) => w.speaker))]
            const ch1Speakers = [...new Set(ch1.map((w: DGWord) => w.speaker))]
            console.log(`[BatchDiarize] ch0 (You/mic): ${ch0.length} words, speakers: [${ch0Speakers.join(', ')}]`)
            console.log(`[BatchDiarize] ch1 (remote): ${ch1.length} words, speakers: [${ch1Speakers.join(', ')}]`)
            words = ([...ch0, ...ch1] as DGWord[]).sort((a, b) => a.start - b.start)
          } else {
            words = dgData.results?.channels?.[0]?.alternatives?.[0]?.words ?? []
            const allSpeakers = [...new Set(words.map((w: DGWord) => w.speaker))]
            console.log(`[BatchDiarize] single-ch: ${words.length} words, unique speakers detected: [${allSpeakers.join(', ')}]`)
            if (allSpeakers.length === 1) console.warn('[BatchDiarize] ⚠️ only 1 speaker detected — Deepgram may have failed to diarize. Check audio quality or use dual-stream capture.')
          }

          console.log(`[BatchDiarize] sending ${words.length} words to /api/re-diarize`)

          if (words.length > 0) {
            const reRes = await fetch('/api/re-diarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId, words }),
            })
            const reData = await reRes.json()
            console.log(`[BatchDiarize] re-diarize complete — ${reData.updated} segments saved to DB`)
          } else {
            console.warn('[BatchDiarize] 0 words from Deepgram — nothing to re-diarize')
          }
        } catch (err) {
          console.error('[BatchDiarize] FAILED:', err)
        } finally {
          setReDiarizing(false)
          console.log('[BatchDiarize] done — reDiarizing set to false, router.refresh() will fire')
        }
      })()
    }
  }, [meetingId])

  return { status, error, elapsedSeconds, liveSegments, audioLevel, reDiarizing, start, stop }
}

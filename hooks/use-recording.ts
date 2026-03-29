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

// ─── Deepgram response types ────────────────────────────────────────────────

interface DGWord {
  word: string
  punctuated_word?: string
  start: number
  end: number
  confidence: number
  speaker: number
  speaker_confidence?: number
}

interface DGResult {
  type: 'Results'
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

  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const segCountRef = useRef(0)
  const isActiveRef = useRef(false)
  // Track the interim segment id so we can replace it cleanly
  const interimIdRef = useRef<string | null>(null)
  // Batch re-diarization
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
  // Deepgram streams two kinds:
  //   is_final=false → interim (unstable, good for real-time display)
  //   is_final=true  → final (stable, split by speaker, save to DB)

  const processResult = useCallback((result: DGResult) => {
    const alt = result.channel.alternatives[0]
    if (!alt) return
    const transcript = alt.transcript.trim()
    if (!transcript || isHallucination(transcript)) return

    const chunkStartMs = Math.round(result.start * 1000)

    if (!result.is_final) {
      // Show interim - one segment with the current speaker
      const speaker = alt.words?.[0]?.speaker ?? 0
      const interimId = interimIdRef.current ?? `interim-${chunkStartMs}`
      interimIdRef.current = interimId
      setLiveSegments((prev) => [
        ...prev.filter((s) => s.id !== interimId),
        {
          id: interimId,
          speaker: `Speaker ${speaker + 1}`,
          content: transcript,
          startMs: chunkStartMs,
          isFinal: false,
        },
      ])
      return
    }

    // Final - clear interim, split into per-speaker segments
    const currentInterimId = interimIdRef.current
    interimIdRef.current = null
    setLiveSegments((prev) => prev.filter((s) => s.id !== currentInterimId))

    if (!alt.words?.length) return

    // Group consecutive words from the same speaker
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
            speaker: `Speaker ${currentSpeaker + 1}`,
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
        speaker: `Speaker ${currentSpeaker + 1}`,
        content: buffer.trim(),
        startMs: Math.round(bufferStart * 1000),
        isFinal: true,
      })
    }

    if (!segments.length) return

    setLiveSegments((prev) => [...prev, ...segments])

    // Persist to DB (fire-and-forget)
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
    interimIdRef.current = null
    audioChunksRef.current = []

    try {
      // 1. Get a short-lived Deepgram token from our server
      const tokenRes = await fetch('/api/deepgram-token')
      if (!tokenRes.ok) throw new Error('Could not create Deepgram session')
      const { token } = await tokenRes.json()
      tokenRef.current = token

      // 2. Capture audio
      let stream: MediaStream
      const supportsTabAudio = typeof navigator?.mediaDevices?.getDisplayMedia === 'function'
      if (supportsTabAudio) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
            video: false,
          })
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
          video: false,
        })
      }
      streamRef.current = stream

      // 3. Detect actual channel count - screen share audio is often stereo
      const nChannels = Math.min(stream.getAudioTracks()[0]?.getSettings()?.channelCount ?? 1, 2)
      nChannelsRef.current = nChannels
      console.log('[Audio] channel count:', nChannels)

      // Audio context at 16kHz - matches linear16 format sent to Deepgram
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // 4. Open Deepgram WebSocket - nova-3 has best real-time diarization accuracy
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen' +
        '?model=nova-3' +            // latest model - best diarization
        '&diarize=true' +
        '&language=en' +
        '&punctuate=true' +
        '&smart_format=true' +
        '&interim_results=true' +
        '&utterance_end_ms=1000' +
        '&vad_events=true' +
        '&encoding=linear16' +
        '&sample_rate=16000' +
        `&channels=${nChannels}`,    // match actual stream channels
        ['token', token]
      )
      wsRef.current = ws

      ws.onopen = () => console.log('[Deepgram] WebSocket open')

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string)
          // Log every message type so we can see what's coming back
          if (data.type === 'Results') {
            const alt = data.channel?.alternatives?.[0]
            const words = alt?.words ?? []
            const speakerMap = words.map((w: DGWord) => `${w.speaker ?? '?'}:${w.word}`).join(' ')
            console.log(`[DG] is_final=${data.is_final} speech_final=${data.speech_final} | ${speakerMap || alt?.transcript}`)
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

      // 5. Stream raw linear16 PCM to Deepgram - 4096 frames at 16kHz ≈ 256ms per chunk
      // eslint-disable-next-line deprecation/deprecation
      const processor = audioCtx.createScriptProcessor(4096, nChannels, nChannels)
      source.connect(processor)
      processor.connect(audioCtx.destination) // required - processor won't fire without output

      processor.onaudioprocess = (e) => {
        if (!isActiveRef.current || ws.readyState !== WebSocket.OPEN) return
        const samplesPerChannel = e.inputBuffer.length
        // Build interleaved int16 PCM for all channels (Deepgram expects LRLRLR... for stereo)
        const i16 = new Int16Array(samplesPerChannel * nChannels)
        for (let ch = 0; ch < nChannels; ch++) {
          const f32 = e.inputBuffer.getChannelData(ch)
          for (let i = 0; i < samplesPerChannel; i++) {
            const s = Math.max(-1, Math.min(1, f32[i]))
            i16[i * nChannels + ch] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
        }
        ws.send(i16.buffer)
        audioChunksRef.current.push(i16) // accumulate for batch re-diarization
      }
      processorRef.current = processor

      await startRecording(meetingId)

      startTimeRef.current = Date.now()
      isActiveRef.current = true
      setStatus('recording')

      // Elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      // Audio level meter
      levelTimerRef.current = setInterval(() => {
        setAudioLevel(getRmsLevel())
      }, 80)

      // Handle track end (e.g. user stops screen share)
      stream.getTracks()[0]?.addEventListener('ended', () => {
        if (isActiveRef.current) stop()
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes('not-allowed') || msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Microphone access denied. Click the mic icon in the address bar to allow it.'
          : msg
      )
      setStatus('idle')
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [meetingId, processResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    if (!isActiveRef.current) return
    isActiveRef.current = false
    setStatus('stopping')
    setAudioLevel(0)

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)

    if (timerRef.current) clearInterval(timerRef.current)
    if (levelTimerRef.current) { clearInterval(levelTimerRef.current); levelTimerRef.current = null }

    // Disconnect PCM processor
    const processor = processorRef.current
    if (processor) {
      processor.disconnect()
      processor.onaudioprocess = null
    }
    processorRef.current = null

    // Give Deepgram a moment to process the last audio, then close
    setTimeout(() => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send CloseStream message so Deepgram finalises the last utterance
        ws.send(JSON.stringify({ type: 'CloseStream' }))
        ws.close()
      }
      wsRef.current = null
    }, 500)

    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    await stopRecording(meetingId, durationSeconds)
    setStatus('idle')
    setElapsedSeconds(0)

    // Trigger AI post-processing
    fetch('/api/ai/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    }).catch((e) => console.error('[AI enhance]', e))

    // Batch re-diarization - runs in background after recording stops
    // Produces accurate speaker labels (especially for 4+ speakers) then updates DB
    const chunks = audioChunksRef.current
    const savedToken = tokenRef.current
    const savedChannels = nChannelsRef.current
    audioChunksRef.current = [] // free ref immediately

    if (chunks.length > 0 && savedToken) {
      setReDiarizing(true);
      (async () => {
        try {
          console.log(`[BatchDiarize] encoding ${chunks.length} chunks (${savedChannels}ch)…`)
          const wav = encodeWAV(chunks, 16000, savedChannels)
          console.log(`[BatchDiarize] WAV size: ${(wav.size / 1024 / 1024).toFixed(1)} MB`)

          const dgRes = await fetch(
            'https://api.deepgram.com/v1/listen' +
            '?model=nova-3' +
            '&diarize=true' +
            '&language=en' +
            '&punctuate=true' +
            '&smart_format=true',
            {
              method: 'POST',
              headers: { Authorization: `Token ${savedToken}`, 'Content-Type': 'audio/wav' },
              body: wav,
            }
          )

          if (!dgRes.ok) throw new Error(`Deepgram batch ${dgRes.status}`)

          const dgData = await dgRes.json()
          const words = dgData.results?.channels?.[0]?.alternatives?.[0]?.words ?? []
          console.log(`[BatchDiarize] got ${words.length} words from batch API`)

          if (words.length > 0) {
            await fetch('/api/re-diarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId, words }),
            })
          }
        } catch (err) {
          console.error('[BatchDiarize]', err)
        } finally {
          setReDiarizing(false)
        }
      })()
    }
  }, [meetingId])

  return { status, error, elapsedSeconds, liveSegments, audioLevel, reDiarizing, start, stop }
}

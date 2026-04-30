'use client'

import { useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { ShiningText } from '@/components/ui/shining-text'
import { TypewriterText } from '@/components/ui/typewriter-text'
import { SpeakerAvatar } from '@/components/ui/speaker-avatar'
import type { TranscriptSegment } from '@/lib/db/schema'
import type { LiveSegment } from '@/hooks/use-recording'

const SPEAKER_PALETTE = [
  { dot: 'bg-[#0075de]', text: 'text-[#0075de] dark:text-[#62aef0]' },
  { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
  { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
  { dot: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400' },
  { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
]

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type AnySegment = TranscriptSegment | LiveSegment

function classifySegment(text: string): 'decision' | 'question' | 'action' | 'risk' | null {
  const t = text.toLowerCase()
  if (/(we decided|let's go with|agreed to|will use|going with)/.test(t)) return 'decision'
  if (/(will you|can you|what about|how do we|when will|who is|clarify)/.test(t)) return 'question'
  if (/(i'll|i will|we'll|will fix|will send|will schedule|action item)/.test(t)) return 'action'
  if (/(blocked|at risk|concern|issue|problem|can't|cannot|delay)/.test(t)) return 'risk'
  return null
}

const SEGMENT_CLASSIFY_CLASSES: Record<string, string> = {
  decision: 'border-l-4 border-emerald-500/60 pl-3',
  question: 'border-l-4 border-blue-500/60 pl-3',
  action: 'border-l-4 border-orange-500/60 pl-3',
  risk: 'border-l-4 border-amber-500/60 pl-3',
}

interface SpeakerGroup {
  key: string
  speaker: string
  startMs: number
  texts: string[]
  isFinal: boolean
}

function groupBySpeaker(segments: AnySegment[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = []
  for (const seg of segments) {
    const speaker = seg.speaker ?? 'Speaker'
    const startMs = seg.startMs
    const isFinal = 'isFinal' in seg ? (seg as LiveSegment).isFinal : true
    const last = groups[groups.length - 1]
    // Only merge consecutive FINAL segments from the same speaker.
    // Non-final (interim) segments stay separate so TypewriterText on the
    // final group never unmounts - preserving its typed position.
    if (last && last.speaker === speaker && last.isFinal && isFinal) {
      last.texts.push(seg.content)
    } else {
      groups.push({ key: seg.id, speaker, startMs, texts: [seg.content], isFinal })
    }
  }
  return groups
}

interface TranscriptPanelProps {
  transcript: TranscriptSegment[]
  liveSegments: LiveSegment[]
  status: string
  isRecording: boolean
  speakerMappings?: Record<string, string>
  // map of segmentId → translated content (applied when user has non-English preferred language)
  translatedSegmentMap?: Record<string, string>
  isTranslating?: boolean
}

export function TranscriptPanel({ transcript, liveSegments, status, isRecording, speakerMappings, translatedSegmentMap, isTranslating }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const colorMapRef = useRef<Record<string, typeof SPEAKER_PALETTE[0]>>({})
  const colorIndexRef = useRef(0)

  function getColor(speaker: string) {
    if (!colorMapRef.current[speaker]) {
      colorMapRef.current[speaker] = SPEAKER_PALETTE[colorIndexRef.current % SPEAKER_PALETTE.length]
      colorIndexRef.current++
    }
    return colorMapRef.current[speaker]
  }

  // Keep showing live segments until the DB transcript has caught up (after page refresh from revalidatePath).
  // Without this, switching source immediately after stop causes a 2-3s blank/wipe.
  const finalLiveCount = liveSegments.filter((s) => s.isFinal).length
  const rawSegments: AnySegment[] =
    isRecording || (finalLiveCount > 0 && transcript.length < finalLiveCount)
      ? liveSegments
      : transcript
  const groups = groupBySpeaker(rawSegments)

  // Build effective speaker mapping:
  // Post-recording: speakerMappings has {"Speaker 1": "Alice"} — use directly
  // During live recording: speakerMappings has {"attendee_0": "Alice", "attendee_1": "Bob"}
  //   → assign attendee names to speakers by first-appearance order in the live transcript
  const attendeeNames = Object.keys(speakerMappings ?? {})
    .filter((k) => k.startsWith('attendee_'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map((k) => (speakerMappings ?? {})[k])

  const effectiveMappings: Record<string, string> = { ...(speakerMappings ?? {}) }
  if (attendeeNames.length > 0) {
    const uniqueSpeakers: string[] = []
    for (const g of groups) {
      if (!uniqueSpeakers.includes(g.speaker)) uniqueSpeakers.push(g.speaker)
    }
    uniqueSpeakers.forEach((spk, idx) => {
      if (attendeeNames[idx] && !effectiveMappings[spk]) {
        effectiveMappings[spk] = attendeeNames[idx]
      }
    })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [groups.length])

  return (
    <div className="flex flex-col rounded-2xl border border-border overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`size-7 rounded-lg flex items-center justify-center ${isRecording ? 'bg-red-500/10' : 'bg-muted'}`}>
            <Mic className={`size-3.5 ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`} strokeWidth={1.75} />
          </div>
          <span className="text-[14px] font-semibold text-foreground">Transcript</span>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10">
              <span className="size-1.5 rounded-full bg-red-500 animate-rec shrink-0" />
              <span className="text-[11px] font-semibold text-red-500">Live</span>
            </div>
          )}
          {!isRecording && transcript.length > 0 && (
            <span className="text-[12px] text-muted-foreground">{transcript.length} segments</span>
          )}
          {translatedSegmentMap && !isRecording && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0075de]/8 text-[#0075de] font-medium">Translated</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-7 min-h-0">
        {isTranslating && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground animate-pulse pb-2">
            <span className="size-1.5 rounded-full bg-[#0075de] shrink-0" />
            Translating transcript…
          </div>
        )}
        {groups.length === 0 ? (
          <EmptyState status={status} isRecording={isRecording} />
        ) : (
          groups.map((group) => {
            const color = getColor(group.speaker)
            const resolvedName = effectiveMappings[group.speaker] ?? group.speaker
            // Use translated content for each segment if available
            const translatedTexts = translatedSegmentMap && !isRecording
              ? group.texts.map((_, i) => {
                  // texts in a group come from consecutive segments with the same speaker;
                  // we stored translations per segment id on the group key (first segment id)
                  // so for a merged group we show translated text from the first segment's translation
                  const segId = group.key
                  return translatedSegmentMap[segId] ?? group.texts[i]
                })
              : group.texts
            const para = (translatedSegmentMap && !isRecording ? translatedTexts : group.texts).join(' ')
            const classification = classifySegment(group.texts.join(' ')) // classify on original
            const classifyClass = classification ? SEGMENT_CLASSIFY_CLASSES[classification] : ''
            return (
              <div
                key={group.key}
                className={`animate-segment ${group.isFinal ? '' : 'opacity-60'} ${classifyClass}`}
                style={{ transition: 'opacity 200ms ease-out' }}
              >
                {/* Speaker + timestamp */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="shrink-0 rounded-full overflow-hidden">
                    <SpeakerAvatar name={resolvedName} size={24} />
                  </div>
                  <span className={`text-[14px] font-semibold tracking-wide ${color.text}`}>
                    {resolvedName}
                  </span>
                  <span className="text-[12px] text-muted-foreground/50">{formatMs(group.startMs)}</span>
                </div>

                {/* Paragraph */}
                <p
                  className="text-[18px] font-medium text-foreground pl-5"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', lineHeight: '1.85', letterSpacing: '0.01em' }}
                >
                  {!group.isFinal ? (
                    /* Listening / sending - blinking cursor only */
                    <span
                      className="inline-block w-[2px] h-[1.1em] bg-foreground/40 rounded-full align-text-bottom animate-pulse"
                    />
                  ) : isRecording ? (
                    /* Live final text - type it in character by character */
                    <TypewriterText text={para} speed={8} />
                  ) : (
                    /* Static transcript (post-recording) - plain text */
                    para
                  )}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function EmptyState({ status, isRecording }: { status: string; isRecording: boolean }) {
  if (isRecording) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <div className="size-10 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
          <Mic className="size-5 text-red-500" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium text-foreground">Listening…</p>
        <p className="text-[13px] text-muted-foreground mt-1">Transcript will appear as you speak</p>
      </div>
    )
  }
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <ShiningText text="Processing transcript…" className="text-[15px]" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
        <Mic className="size-6 text-muted-foreground/40" strokeWidth={1} />
      </div>
      <p className="text-[14px] font-medium text-foreground">No transcript yet</p>
      <p className="text-[13px] text-muted-foreground mt-1">
        {status === 'pending' ? 'Start recording to generate a transcript' : 'No transcript was recorded'}
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Users } from 'lucide-react'
import type { Meeting, TranscriptSegment, MeetingTranslation } from '@/lib/db/schema'
import { useRecording } from '@/hooks/use-recording'
import { RecordingControls } from '@/components/recording/recording-controls'
import { TranscriptPanel } from '@/components/dashboard/transcript-panel'
import { LiveAssistantPanel } from '@/components/dashboard/live-assistant-panel'
import { SpeakerNameModal } from '@/components/dashboard/speaker-name-modal'

interface MeetingClientProps {
  meeting: Meeting
  transcript: TranscriptSegment[]
  speakerMappings?: Record<string, string>
  preferredLanguage?: string
  initialTranslation?: MeetingTranslation | null
}

export function MeetingClient({
  meeting,
  transcript,
  speakerMappings: initialMappings,
  preferredLanguage = 'en',
  initialTranslation,
}: MeetingClientProps) {
  const router = useRouter()
  const { status, error, elapsedSeconds, audioLevel, liveSegments, reDiarizing, start, stop } = useRecording({
    meetingId: meeting.id,
  })
  const prevReDiarizingRef = useRef(false)
  const [mappings, setMappings] = useState<Record<string, string>>(initialMappings ?? {})
  const [showNamingModal, setShowNamingModal] = useState(false)

  // Translation state
  const needsTranslation = preferredLanguage !== 'en'
  const [translation, setTranslation] = useState<MeetingTranslation | null>(initialTranslation ?? null)
  const [isTranslating, setIsTranslating] = useState(false)
  const translationTriggeredRef = useRef(false)

  // Build segment map from cached translation
  const translatedSegmentMap: Record<string, string> | undefined = (() => {
    if (!translation?.transcript) return undefined
    try {
      const arr: { id: string; content: string }[] = JSON.parse(translation.transcript)
      return Object.fromEntries(arr.map((s) => [s.id, s.content]))
    } catch {
      return undefined
    }
  })()

  // Lazy-trigger translation when user has a non-English preferred language and no cache yet
  useEffect(() => {
    if (
      !needsTranslation ||
      translation !== null ||
      translationTriggeredRef.current ||
      transcript.length === 0 ||
      meeting.status !== 'completed'
    ) return

    translationTriggeredRef.current = true
    setIsTranslating(true)
    fetch('/api/translate/meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: meeting.id, targetLanguage: preferredLanguage }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.translation) setTranslation(data.translation)
      })
      .catch((e) => console.error('[Translation]', e))
      .finally(() => setIsTranslating(false))
  }, [needsTranslation, translation, transcript.length, meeting.id, meeting.status, preferredLanguage])

  // When re-diarization finishes, refresh then show naming modal only if no attendees were pre-set
  useEffect(() => {
    if (prevReDiarizingRef.current && !reDiarizing) {
      const hasPreSetAttendees = Object.keys(mappings).some((k) => k.startsWith('attendee_'))
      if (!hasPreSetAttendees) setTimeout(() => setShowNamingModal(true), 1200)
      router.refresh()
    }
    prevReDiarizingRef.current = reDiarizing
  }, [reDiarizing, router, mappings])

  // On mount: show naming modal if multiple speakers and no mappings at all
  useEffect(() => {
    const uniqueSpeakers = [...new Set(transcript.map((s) => s.speaker).filter(Boolean))]
    const hasPreSetAttendees = Object.keys(mappings).some((k) => k.startsWith('attendee_'))
    if (uniqueSpeakers.length > 1 && Object.keys(mappings).length === 0 && !hasPreSetAttendees) {
      setShowNamingModal(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [assistantOpen, setAssistantOpen] = useState(false)

  const isRecordingActive = status === 'recording' || status === 'stopping' || status === 'requesting'
  const displayStatus =
    status === 'recording' || status === 'stopping' ? 'recording' : meeting.status

  const speakerKeys = [...new Set(transcript.map((s) => s.speaker).filter(Boolean))] as string[]

  return (
    <div className="flex flex-col gap-4">
      {reDiarizing && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[13px] text-purple-500">
          <Users className="size-4 shrink-0" strokeWidth={1.75} />
          <span>Improving speaker labels for large meetings… this may take a moment.</span>
        </div>
      )}

      <RecordingControls
        status={status}
        error={error}
        elapsedSeconds={elapsedSeconds}
        audioLevel={audioLevel}
        initialStatus={meeting.status}
        onStart={start}
        onStop={stop}
      />

      <div className="relative flex gap-3" style={{ height: 'calc(100vh - 240px)' }}>
        {/* Transcript panel */}
        <div className="flex-1 min-w-0">
          <TranscriptPanel
            transcript={transcript}
            liveSegments={liveSegments}
            status={displayStatus}
            isRecording={isRecordingActive}
            speakerMappings={mappings}
            translatedSegmentMap={translatedSegmentMap}
            isTranslating={isTranslating}
          />
        </div>

        {/* AI assistant panel (collapsible) */}
        {assistantOpen ? (
          <LiveAssistantPanel
            liveSegments={liveSegments}
            meetingId={meeting.id}
            meetingTitle={meeting.title ?? 'Untitled Meeting'}
            isRecording={isRecordingActive}
            open={assistantOpen}
            onClose={() => setAssistantOpen(false)}
          />
        ) : (
          <button
            onClick={() => setAssistantOpen(true)}
            className="absolute right-0 top-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-l-xl border border-r-0 border-border bg-background shadow-sm hover:bg-muted active:scale-[0.97]"
            style={{ transition: 'background-color 150ms ease-out' }}
            title="Open AI Assistant"
          >
            <Bot className="size-4 text-purple-500" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold text-purple-500">AI</span>
          </button>
        )}
      </div>

      <SpeakerNameModal
        open={showNamingModal && speakerKeys.length > 1}
        onClose={() => setShowNamingModal(false)}
        meetingId={meeting.id}
        speakerKeys={speakerKeys}
        onSaved={(m) => setMappings(m)}
      />
    </div>
  )
}

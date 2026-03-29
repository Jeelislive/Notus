'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Users } from 'lucide-react'
import type { Meeting, TranscriptSegment } from '@/lib/db/schema'
import { useRecording } from '@/hooks/use-recording'
import { RecordingControls } from '@/components/recording/recording-controls'
import { TranscriptPanel } from '@/components/dashboard/transcript-panel'
import { LiveAssistantPanel } from '@/components/dashboard/live-assistant-panel'
import { SpeakerNameModal } from '@/components/dashboard/speaker-name-modal'

interface MeetingClientProps {
  meeting: Meeting
  transcript: TranscriptSegment[]
  speakerMappings?: Record<string, string>
}

export function MeetingClient({ meeting, transcript, speakerMappings: initialMappings }: MeetingClientProps) {
  const router = useRouter()
  const { status, error, elapsedSeconds, audioLevel, liveSegments, reDiarizing, start, stop } = useRecording({
    meetingId: meeting.id,
  })
  const prevReDiarizingRef = useRef(false)
  const [mappings, setMappings] = useState<Record<string, string>>(initialMappings ?? {})
  const [showNamingModal, setShowNamingModal] = useState(false)

  // When re-diarization finishes, refresh server data to load corrected speaker labels
  // then show speaker naming modal after a brief delay
  useEffect(() => {
    if (prevReDiarizingRef.current && !reDiarizing) {
      setTimeout(() => setShowNamingModal(true), 1200)
      router.refresh()
    }
    prevReDiarizingRef.current = reDiarizing
  }, [reDiarizing, router])

  // On mount: show naming modal if multiple speakers and no mappings yet
  useEffect(() => {
    const uniqueSpeakers = [...new Set(transcript.map((s) => s.speaker).filter(Boolean))]
    if (uniqueSpeakers.length > 1 && Object.keys(mappings).length === 0) {
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
        {/* Transcript panel — fills remaining width */}
        <div className="flex-1 min-w-0">
          <TranscriptPanel
            transcript={transcript}
            liveSegments={liveSegments}
            status={displayStatus}
            isRecording={isRecordingActive}
            speakerMappings={mappings}
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
          /* Floating AI button on the right edge when panel is closed */
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

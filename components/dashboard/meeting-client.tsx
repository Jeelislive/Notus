'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Users } from 'lucide-react'
import type { Meeting, TranscriptSegment } from '@/lib/db/schema'
import { useRecording } from '@/hooks/use-recording'
import { RecordingControls } from '@/components/recording/recording-controls'
import { TranscriptPanel } from '@/components/dashboard/transcript-panel'
import { LiveAssistantPanel } from '@/components/dashboard/live-assistant-panel'

interface MeetingClientProps {
  meeting: Meeting
  transcript: TranscriptSegment[]
}

export function MeetingClient({ meeting, transcript }: MeetingClientProps) {
  const router = useRouter()
  const { status, error, elapsedSeconds, audioLevel, liveSegments, reDiarizing, start, stop } = useRecording({
    meetingId: meeting.id,
  })
  const prevReDiarizingRef = useRef(false)

  // When re-diarization finishes, refresh server data to load corrected speaker labels
  useEffect(() => {
    if (prevReDiarizingRef.current && !reDiarizing) {
      router.refresh()
    }
    prevReDiarizingRef.current = reDiarizing
  }, [reDiarizing, router])
  const [assistantOpen, setAssistantOpen] = useState(false)

  const isRecordingActive = status === 'recording' || status === 'stopping' || status === 'requesting'
  const displayStatus =
    status === 'recording' || status === 'stopping' ? 'recording' : meeting.status

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
    </div>
  )
}

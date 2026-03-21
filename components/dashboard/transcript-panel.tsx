import { Mic, Clock } from 'lucide-react'
import type { TranscriptSegment } from '@/lib/db/schema'

const SPEAKER_COLORS = [
  'text-indigo-400',
  'text-violet-400',
  'text-emerald-400',
  'text-sky-400',
  'text-pink-400',
  'text-amber-400',
]

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface TranscriptPanelProps {
  transcript: TranscriptSegment[]
  status: string
}

export function TranscriptPanel({ transcript, status }: TranscriptPanelProps) {
  const speakerColors: Record<string, string> = {}
  let colorIndex = 0

  transcript.forEach((seg) => {
    const speaker = seg.speaker ?? 'Unknown'
    if (!speakerColors[speaker]) {
      speakerColors[speaker] = SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length]
      colorIndex++
    }
  })

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Mic className="size-4 text-zinc-500" strokeWidth={1.5} />
          <span className="text-sm font-medium text-zinc-300">Transcript</span>
        </div>
        {status === 'recording' && (
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-red-400" style={{ animation: 'pulseRec 1.4s ease-in-out infinite' }} />
            <span className="text-xs text-red-400 font-medium">Live</span>
          </div>
        )}
        {transcript.length > 0 && (
          <span className="text-xs text-zinc-600">{transcript.length} segments</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[600px]">
        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            {status === 'pending' || status === 'completed' ? (
              <>
                <Mic className="size-8 text-zinc-700 mb-3" strokeWidth={1} />
                <p className="text-sm text-zinc-600">No transcript yet</p>
                <p className="text-xs text-zinc-700 mt-1">
                  {status === 'pending'
                    ? 'Start recording to generate a transcript'
                    : 'Recording did not produce a transcript'}
                </p>
              </>
            ) : status === 'processing' ? (
              <>
                <div className="size-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 mb-3" style={{ animation: 'spin 1s linear infinite' }} />
                <p className="text-sm text-zinc-500">Processing transcript...</p>
              </>
            ) : null}
          </div>
        ) : (
          transcript.map((segment) => {
            const speaker = segment.speaker ?? 'Unknown'
            const color = speakerColors[speaker]
            return (
              <div key={segment.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${color}`}>{speaker}</span>
                  <span className="text-xs text-zinc-700 flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {formatMs(segment.startMs)}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{segment.content}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

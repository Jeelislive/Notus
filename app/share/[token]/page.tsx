import type { Metadata } from 'next'
import { Calendar, Clock, CheckSquare, Mic } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { meetings, notes, transcriptSegments } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { formatDate, formatDuration } from '@/lib/utils'

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const meeting = await getMeetingByToken(token)
  return { title: meeting ? `${meeting.title} | Notus` : 'Shared Meeting | Notus' }
}

async function getMeetingByToken(token: string) {
  const result = await db.select().from(meetings).where(eq(meetings.shareToken, token)).limit(1)
  return result[0] ?? null
}

export default async function SharePage({ params }: Props) {
  const { token } = await params
  const meeting = await getMeetingByToken(token)

  if (!meeting || meeting.visibility !== 'public') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="size-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-5">
            <Mic className="size-7 text-muted-foreground/40" strokeWidth={1} />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Link no longer active</h1>
          <p className="text-[14px] text-muted-foreground">This meeting link has been revoked or doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  const [note, transcript] = await Promise.all([
    db.select().from(notes).where(eq(notes.meetingId, meeting.id)).limit(1).then((r) => r[0] ?? null),
    db.select().from(transcriptSegments).where(eq(transcriptSegments.meetingId, meeting.id)).orderBy(asc(transcriptSegments.startMs)),
  ])

  let actionItems: string[] = []
  if (note?.actionItems) {
    try { actionItems = JSON.parse(note.actionItems) } catch { actionItems = [] }
  }

  const SPEAKER_COLORS: Record<string, string> = {}
  const PALETTE = ['text-indigo-600', 'text-violet-600', 'text-emerald-600', 'text-sky-600', 'text-pink-600', 'text-amber-600']
  let colorIdx = 0
  function getSpeakerColor(speaker: string) {
    if (!SPEAKER_COLORS[speaker]) { SPEAKER_COLORS[speaker] = PALETTE[colorIdx++ % PALETTE.length] }
    return SPEAKER_COLORS[speaker]
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-6 rounded-md bg-primary flex items-center justify-center">
            <svg className="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-muted-foreground">Notus</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">{meeting.title}</h1>
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formatDate(meeting.createdAt)}
          </span>
          {(meeting.durationSeconds ?? 0) > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatDuration(meeting.durationSeconds ?? 0)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* AI Summary */}
        {note?.summary && (
          <section className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-6">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-3">Summary</p>
            <p className="text-[15px] text-foreground leading-relaxed">{note.summary}</p>
          </section>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Action Items</p>
            </div>
            <ul className="space-y-2">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="size-4 rounded border border-emerald-500/30 mt-0.5 shrink-0" />
                  <span className="text-[14px] text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {note?.content && note.content !== '' && note.content !== '<p></p>' && (
          <section className="rounded-2xl border border-border p-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Notes</p>
            <div
              className="tiptap-content text-[14px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </section>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <section className="rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mic className="size-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Transcript</p>
              <span className="text-[12px] text-muted-foreground/50 ml-auto">{transcript.length} segments</span>
            </div>
            <div className="space-y-5">
              {transcript.map((seg) => {
                const speaker = seg.speaker ?? 'Speaker'
                const color = getSpeakerColor(speaker)
                const s = Math.floor(seg.startMs / 1000)
                const timestamp = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
                return (
                  <div key={seg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] font-semibold ${color}`}>{speaker}</span>
                      <span className="text-[11px] text-muted-foreground/50">{timestamp}</span>
                    </div>
                    <p className="text-[14px] text-foreground leading-relaxed pl-0">{seg.content}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">Shared via Notus · AI Meeting Notes</p>
        <Link href="/" className="text-[12px] text-indigo-500 hover:text-indigo-400 font-medium" style={{ transition: 'color 150ms ease-out' }}>
          Try Notus →
        </Link>
      </div>
    </div>
  )
}

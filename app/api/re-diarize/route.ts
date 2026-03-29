import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { transcriptSegments, meetings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { log } from '@/lib/logger'

const logger = log('re-diarize')

interface DGWord {
  word: string
  punctuated_word?: string
  start: number
  end: number
  confidence: number
  speaker: number
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, words } = await request.json() as { meetingId: string; words: DGWord[] }
  if (!meetingId || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify meeting ownership
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  // Group consecutive words from the same speaker into segments
  const segments: { speaker: string; content: string; startMs: number; endMs: number }[] = []
  let buffer = ''
  let bufferStart = words[0].start
  let bufferEnd = words[0].end
  let currentSpeaker = words[0].speaker

  for (const w of words) {
    const text = w.punctuated_word ?? w.word
    if (w.speaker !== currentSpeaker) {
      if (buffer.trim()) {
        segments.push({
          speaker: `Speaker ${currentSpeaker + 1}`,
          content: buffer.trim(),
          startMs: Math.round(bufferStart * 1000),
          endMs: Math.round(bufferEnd * 1000),
        })
      }
      buffer = text
      bufferStart = w.start
      bufferEnd = w.end
      currentSpeaker = w.speaker
    } else {
      buffer += (buffer ? ' ' : '') + text
      bufferEnd = w.end
    }
  }
  if (buffer.trim()) {
    segments.push({
      speaker: `Speaker ${currentSpeaker + 1}`,
      content: buffer.trim(),
      startMs: Math.round(bufferStart * 1000),
      endMs: Math.round(bufferEnd * 1000),
    })
  }

  if (segments.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  // Replace all existing segments for this meeting with the re-diarized ones
  await db.delete(transcriptSegments).where(eq(transcriptSegments.meetingId, meetingId))
  await db.insert(transcriptSegments).values(
    segments.map((s) => ({ meetingId, ...s }))
  )

  const uniqueSpeakers = new Set(segments.map(s => s.speaker)).size
  logger.info('Re-diarization complete', { meetingId, segments: segments.length, speakers: uniqueSpeakers, userId: session.user.id })

  return NextResponse.json({ updated: segments.length })
}

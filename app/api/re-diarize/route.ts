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
  _channel?: number // 0 = local mic ("You"), 1 = remote/system, undefined = single channel
}

function getSpeakerKey(w: DGWord): string {
  return w._channel === 0 ? 'you' : `ch${w._channel ?? 1}-spk${w.speaker}`
}

function getRawLabel(w: DGWord): string {
  return w._channel === 0 ? 'You' : `Speaker ${w.speaker + 1}`
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, words } = await request.json() as { meetingId: string; words: DGWord[] }
  if (!meetingId || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  // Build ordered list of attendee names from pre-set speakerMappings (attendee_0, attendee_1, ...)
  const existingMappings = (meeting.speakerMappings ?? {}) as Record<string, string>
  const attendeeNames: string[] = Object.keys(existingMappings)
    .filter((k) => k.startsWith('attendee_'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map((k) => existingMappings[k])

  logger.info('Re-diarize start', { meetingId, attendees: attendeeNames, words: words.length })

  // Group consecutive words by (channel, speaker) into segments
  const segments: { speaker: string; content: string; startMs: number; endMs: number }[] = []
  let buffer = ''
  let bufferStart = words[0].start
  let bufferEnd = words[0].end
  let currentKey = getSpeakerKey(words[0])
  let currentLabel = getRawLabel(words[0])

  for (const w of words) {
    const key = getSpeakerKey(w)
    const text = w.punctuated_word ?? w.word
    if (key !== currentKey) {
      if (buffer.trim()) {
        segments.push({ speaker: currentLabel, content: buffer.trim(), startMs: Math.round(bufferStart * 1000), endMs: Math.round(bufferEnd * 1000) })
      }
      buffer = text
      bufferStart = w.start
      bufferEnd = w.end
      currentKey = key
      currentLabel = getRawLabel(w)
    } else {
      buffer += (buffer ? ' ' : '') + text
      bufferEnd = w.end
    }
  }
  if (buffer.trim()) {
    segments.push({ speaker: currentLabel, content: buffer.trim(), startMs: Math.round(bufferStart * 1000), endMs: Math.round(bufferEnd * 1000) })
  }

  if (segments.length === 0) return NextResponse.json({ updated: 0 })

  // If attendees were pre-entered, build final mappings by first-appearance order
  // Speaker who speaks first → attendee_0, second unique speaker → attendee_1, etc.
  let finalMappings = existingMappings
  if (attendeeNames.length > 0) {
    const speakerOrder: string[] = [] // ordered by first appearance
    for (const seg of segments) {
      if (!speakerOrder.includes(seg.speaker)) speakerOrder.push(seg.speaker)
    }
    logger.info('Speaker first-appearance order', { meetingId, speakerOrder, attendeeNames })

    finalMappings = {}
    speakerOrder.forEach((rawLabel, idx) => {
      const name = attendeeNames[idx] ?? rawLabel
      finalMappings[rawLabel] = name
    })

    // Apply names to segments
    for (const seg of segments) {
      seg.speaker = finalMappings[seg.speaker] ?? seg.speaker
    }

    // Save final mappings back to meeting
    await db.update(meetings)
      .set({ speakerMappings: finalMappings, updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))
  }

  await db.delete(transcriptSegments).where(eq(transcriptSegments.meetingId, meetingId))
  await db.insert(transcriptSegments).values(segments.map((s) => ({ meetingId, ...s })))

  const uniqueSpeakers = new Set(segments.map(s => s.speaker)).size
  logger.info('Re-diarization complete', { meetingId, segments: segments.length, speakers: uniqueSpeakers, attendeesApplied: attendeeNames.length > 0 })

  return NextResponse.json({ updated: segments.length })
}

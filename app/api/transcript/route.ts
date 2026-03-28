import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { transcriptSegments, meetings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, speaker, content, startMs, endMs } = await request.json()
  if (!meetingId || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify meeting ownership
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const [segment] = await db
    .insert(transcriptSegments)
    .values({
      meetingId,
      speaker: speaker ?? 'Speaker',
      content,
      startMs: startMs ?? 0,
      endMs: endMs ?? 0,
    })
    .returning()

  return NextResponse.json({ segment })
}

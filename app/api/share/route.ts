import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json()
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = randomBytes(16).toString('hex')
  await db.update(meetings).set({ shareToken: token, visibility: 'public', updatedAt: new Date() }).where(eq(meetings.id, meetingId))

  return NextResponse.json({ token })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json()
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(meetings).set({ shareToken: null, visibility: 'private', updatedAt: new Date() }).where(eq(meetings.id, meetingId))

  return NextResponse.json({ success: true })
}

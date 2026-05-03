import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// EXECUTE — only called after user approves. Performs the DB writes.
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { kind, meetingIds, folderId } = body as {
    kind: 'move_to_folder' | 'remove_from_folder'
    meetingIds: string[]
    folderId: string
  }

  if (!kind || !meetingIds?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (kind === 'move_to_folder') {
    if (!folderId) return NextResponse.json({ error: 'Missing folderId' }, { status: 400 })
    await db
      .update(meetings)
      .set({ folderId })
      .where(and(inArray(meetings.id, meetingIds), eq(meetings.userId, session.user.id)))
    return NextResponse.json({ success: true })
  }

  if (kind === 'remove_from_folder') {
    await db
      .update(meetings)
      .set({ folderId: null })
      .where(and(inArray(meetings.id, meetingIds), eq(meetings.userId, session.user.id)))
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action kind' }, { status: 400 })
}

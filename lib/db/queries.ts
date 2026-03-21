import { db } from './index'
import { meetings, notes, transcriptSegments, profiles } from './schema'
import { eq, desc, ilike, or, sql, and } from 'drizzle-orm'

export async function getMeetingsByUser(userId: string) {
  return db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, userId))
    .orderBy(desc(meetings.createdAt))
}

export async function getMeetingById(meetingId: string, userId: string) {
  const result = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)))
    .limit(1)
  return result[0] ?? null
}

export async function getNoteByMeetingId(meetingId: string) {
  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.meetingId, meetingId))
    .limit(1)
  return result[0] ?? null
}

export async function getTranscriptByMeetingId(meetingId: string) {
  return db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(transcriptSegments.startMs)
}

export async function searchMeetingsByUser(userId: string, query: string) {
  return db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        ilike(meetings.title, `%${query}%`)
      )
    )
    .orderBy(desc(meetings.createdAt))
    .limit(20)
}

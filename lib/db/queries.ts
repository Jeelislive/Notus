import { db } from './index'
import { meetings, notes, transcriptSegments, profiles, teams, teamMembers, meetingTranslations } from './schema'
import { eq, desc, ilike, sql, and } from 'drizzle-orm'

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
    .orderBy(notes.createdAt)
    .limit(1)
  return result[0] ?? null
}

export async function getNotesByMeetingId(meetingId: string) {
  return db
    .select()
    .from(notes)
    .where(eq(notes.meetingId, meetingId))
    .orderBy(notes.createdAt)
}

export async function getNoteById(noteId: string) {
  const result = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1)
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

export async function getMeetingByShareToken(token: string) {
  const result = await db.select().from(meetings).where(eq(meetings.shareToken, token)).limit(1)
  return result[0] ?? null
}

export async function getTeamsByUser(userId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(desc(teams.createdAt))
}

export async function getTeamById(teamId: string, userId: string) {
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1)
  return result[0] ?? null
}

export async function getTeamMembers(teamId: string) {
  return db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      userId: teamMembers.userId,
      name: profiles.fullName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
    })
    .from(teamMembers)
    .innerJoin(profiles, eq(teamMembers.userId, profiles.id))
    .where(eq(teamMembers.teamId, teamId))
}

export async function getMeetingsByTeam(teamId: string) {
  return db
    .select()
    .from(meetings)
    .where(eq(meetings.teamId, teamId))
    .orderBy(desc(meetings.createdAt))
}

export async function getMeetingTranslation(meetingId: string, language: string) {
  const result = await db
    .select()
    .from(meetingTranslations)
    .where(and(eq(meetingTranslations.meetingId, meetingId), eq(meetingTranslations.language, language)))
    .limit(1)
  return result[0] ?? null
}

export async function upsertMeetingTranslation(
  meetingId: string,
  language: string,
  data: {
    transcript?: string
    summary?: string
    summaryStructured?: string
    actionItems?: string
    followUpEmail?: string
  }
) {
  const existing = await getMeetingTranslation(meetingId, language)
  if (existing) {
    await db
      .update(meetingTranslations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(meetingTranslations.meetingId, meetingId), eq(meetingTranslations.language, language)))
  } else {
    await db.insert(meetingTranslations).values({ meetingId, language, ...data })
  }
}

export async function getUserPreferredLanguage(userId: string): Promise<string> {
  const result = await db.select({ preferredLanguage: profiles.preferredLanguage })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
  return result[0]?.preferredLanguage ?? 'en'
}

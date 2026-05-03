'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, notes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session.user
}

export async function createMeeting(formData: FormData) {
  const user = await getAuthenticatedUser()
  const title = (formData.get('title') as string)?.trim() || 'Untitled Meeting'
  const templateContent = (formData.get('templateContent') as string) ?? ''
  const templateId = (formData.get('templateId') as string) ?? null
  const templateName = (formData.get('templateName') as string)?.trim() ?? ''
  const meetingType = ((formData.get('meetingType') as string) || 'other') as
    'one_on_one' | 'team_meeting' | 'standup' | 'interview' | 'client' | 'other'

  const attendeesRaw = (formData.get('attendees') as string) ?? ''
  const attendeeNames = attendeesRaw.split(',').map((n) => n.trim()).filter(Boolean)
  const speakerMappings: Record<string, string> =
    attendeeNames.length > 0
      ? Object.fromEntries(attendeeNames.map((name, i) => [`attendee_${i}`, name]))
      : {}

  const folderId = (formData.get('folderId') as string) || null

  const [meeting] = await db
    .insert(meetings)
    .values({
      userId: user.id,
      title,
      status: 'pending',
      templateId: templateId || null,
      meetingType,
      templateName: templateName || null,
      folderId: folderId || null,
      speakerMappings: Object.keys(speakerMappings).length > 0 ? speakerMappings : undefined,
    })
    .returning()

  await db.insert(notes).values({
    meetingId: meeting.id,
    userId: user.id,
    content: templateContent,
    title: templateName || 'Note',
  })

  revalidatePath('/dashboard')
  return { meeting }
}

export async function renameMeeting(meetingId: string, title: string) {
  const user = await getAuthenticatedUser()
  const trimmed = title.trim()
  if (!trimmed) return { error: 'Title cannot be empty' }

  await db
    .update(meetings)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  return { success: true }
}

export async function deleteMeeting(meetingId: string) {
  const user = await getAuthenticatedUser()

  await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  return { success: true }
}

export async function deleteAllMeetings() {
  const user = await getAuthenticatedUser()

  await db.delete(meetings).where(eq(meetings.userId, user.id))

  revalidatePath('/dashboard')
}

export async function startRecording(meetingId: string) {
  const user = await getAuthenticatedUser()

  await db
    .update(meetings)
    .set({ status: 'recording', startedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  return { success: true }
}

export async function stopRecording(meetingId: string, durationSeconds: number) {
  const user = await getAuthenticatedUser()

  await db
    .update(meetings)
    .set({ status: 'processing', endedAt: new Date(), durationSeconds, updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  return { success: true }
}

export async function updateNoteContent(meetingId: string, content: string, noteId?: string) {
  const user = await getAuthenticatedUser()

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  if (noteId) {
    await db.update(notes).set({ content, updatedAt: new Date() }).where(eq(notes.id, noteId))
  } else {
    await db.update(notes).set({ content, updatedAt: new Date() }).where(eq(notes.meetingId, meetingId))
  }

  return { success: true }
}

export async function createNote(meetingId: string, title: string) {
  const user = await getAuthenticatedUser()

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  const [note] = await db
    .insert(notes)
    .values({ meetingId, userId: user.id, title: title.trim() || 'Untitled note', content: '' })
    .returning()

  return { note }
}

export async function renameNote(noteId: string, title: string) {
  const user = await getAuthenticatedUser()
  const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) })
  if (!note) return { error: 'Note not found' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, note.meetingId), eq(meetings.userId, user.id)),
  })
  if (!meeting) return { error: 'Unauthorized' }

  await db.update(notes).set({ title: title.trim() || 'Untitled note', updatedAt: new Date() }).where(eq(notes.id, noteId))
  return { success: true }
}

export async function deleteNote(noteId: string) {
  const user = await getAuthenticatedUser()
  const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) })
  if (!note) return { error: 'Note not found' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, note.meetingId), eq(meetings.userId, user.id)),
  })
  if (!meeting) return { error: 'Unauthorized' }

  await db.delete(notes).where(eq(notes.id, noteId))
  return { success: true }
}

export async function completeMeeting(meetingId: string) {
  const user = await getAuthenticatedUser()

  await db
    .update(meetings)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  return { success: true }
}

export async function saveSpeakerMappings(meetingId: string, mappings: Record<string, string>) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  await db
    .update(meetings)
    .set({ speakerMappings: mappings, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId))

  return { success: true }
}

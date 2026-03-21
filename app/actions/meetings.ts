'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { meetings, notes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export async function createMeeting(formData: FormData) {
  const user = await getAuthenticatedUser()
  const title = (formData.get('title') as string)?.trim() || 'Untitled Meeting'

  const [meeting] = await db
    .insert(meetings)
    .values({
      userId: user.id,
      title,
      status: 'pending',
    })
    .returning()

  // Create an empty notes record for this meeting
  await db.insert(notes).values({
    meetingId: meeting.id,
    userId: user.id,
    content: '',
  })

  revalidatePath('/dashboard')
  redirect(`/dashboard/meetings/${meeting.id}`)
}

export async function renameMeeting(meetingId: string, title: string) {
  const user = await getAuthenticatedUser()
  const trimmed = title.trim()
  if (!trimmed) return { error: 'Title cannot be empty' }

  await db
    .update(meetings)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/meetings/${meetingId}`)
  return { success: true }
}

export async function deleteMeeting(meetingId: string) {
  const user = await getAuthenticatedUser()

  await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateNoteContent(meetingId: string, content: string) {
  const user = await getAuthenticatedUser()

  // Verify meeting ownership
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  await db
    .update(notes)
    .set({ content, updatedAt: new Date() })
    .where(eq(notes.meetingId, meetingId))

  return { success: true }
}

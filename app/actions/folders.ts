'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { folders, meetings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function getUser() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session.user
}

export async function createFolder(name: string, description: string, icon: string) {
  const user = await getUser()
  const result = await db.insert(folders).values({
    userId: user.id,
    name: name.trim(),
    description: description.trim() || null,
    icon: icon || '📁',
  }).returning()
  revalidatePath('/dashboard')
  return { id: result[0].id }
}

export async function deleteFolder(folderId: string) {
  const user = await getUser()
  // Unassign meetings from folder before deleting
  await db.update(meetings)
    .set({ folderId: null })
    .where(and(eq(meetings.folderId, folderId), eq(meetings.userId, user.id)))
  await db.delete(folders).where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
  revalidatePath('/dashboard')
}

export async function updateFolder(folderId: string, name: string, description: string, icon: string) {
  const user = await getUser()
  await db.update(folders)
    .set({ name: name.trim(), description: description.trim() || null, icon, updatedAt: new Date() })
    .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/folder/${folderId}`)
}

export async function assignMeetingToFolder(meetingId: string, folderId: string | null) {
  const user = await getUser()
  await db.update(meetings)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)))
  revalidatePath('/dashboard')
}

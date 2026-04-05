'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { teams, teamMembers, profiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/session'

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function requireMembership(teamId: string, userId: string, requireAdmin = false) {
  const result = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1)
  const member = result[0]
  if (!member) throw new Error('Not a member of this team')
  if (requireAdmin && member.role !== 'admin') throw new Error('Admin access required')
  return member
}

export async function createTeam(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 2) throw new Error('Team name must be at least 2 characters')

  const baseSlug = slugify(name)
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const [team] = await db
    .insert(teams)
    .values({ name, slug, ownerId: session.user.id })
    .returning()

  // Creator becomes admin
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: session.user.id,
    role: 'admin',
  })

  revalidatePath('/dashboard/teams')
  return { team }
}

export async function inviteMember(teamId: string, email: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await requireMembership(teamId, session.user.id, true)

  // Look up profile by email
  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email.toLowerCase().trim()))
    .limit(1)
    .then((r) => r[0] ?? null)

  if (!profile) return { error: 'No user found with that email address.' }

  // Check if already a member
  const existing = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, profile.id)))
    .limit(1)
    .then((r) => r[0] ?? null)

  if (existing) return { error: 'That user is already a member of this team.' }

  await db.insert(teamMembers).values({ teamId, userId: profile.id, role: 'member' })

  revalidatePath(`/dashboard/teams/${teamId}`)
  return { success: true }
}

export async function removeMember(teamId: string, memberId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1).then((r) => r[0])
  if (!team) throw new Error('Team not found')

  // Can't remove the owner
  if (memberId === team.ownerId) throw new Error('Cannot remove the team owner')

  // Must be admin OR removing yourself
  const requesterMember = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.user.id)))
    .limit(1)
    .then((r) => r[0])

  if (!requesterMember) throw new Error('Not a member')
  if (requesterMember.role !== 'admin' && memberId !== session.user.id) {
    throw new Error('Admin access required')
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)))

  revalidatePath(`/dashboard/teams/${teamId}`)
}

export async function changeMemberRole(teamId: string, memberId: string, role: 'admin' | 'member') {
  const session = await getSession()
  if (!session) redirect('/login')

  await requireMembership(teamId, session.user.id, true)

  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1).then((r) => r[0])
  if (!team) throw new Error('Team not found')
  if (memberId === team.ownerId) throw new Error('Cannot change role of the team owner')

  await db
    .update(teamMembers)
    .set({ role })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)))

  revalidatePath(`/dashboard/teams/${teamId}`)
}

export async function leaveTeam(teamId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1).then((r) => r[0])
  if (!team) throw new Error('Team not found')
  if (team.ownerId === session.user.id) throw new Error('Owner cannot leave - transfer ownership or delete the team first')

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.user.id)))

  revalidatePath('/dashboard/teams')
  redirect('/dashboard/teams')
}

export async function deleteTeam(teamId: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1).then((r) => r[0])
  if (!team) throw new Error('Team not found')
  if (team.ownerId !== session.user.id) throw new Error('Only the owner can delete this team')

  await db.delete(teams).where(eq(teams.id, teamId))

  revalidatePath('/dashboard/teams')
  redirect('/dashboard/teams')
}

export async function renameTeam(teamId: string, name: string) {
  const session = await getSession()
  if (!session) redirect('/login')

  await requireMembership(teamId, session.user.id, true)

  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) throw new Error('Team name must be at least 2 characters')

  await db.update(teams).set({ name: trimmed }).where(eq(teams.id, teamId))

  revalidatePath(`/dashboard/teams/${teamId}`)
  revalidatePath('/dashboard/teams')
}

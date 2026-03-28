'use server'

import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { templates } from '@/lib/db/schema'
import { eq, or, isNull } from 'drizzle-orm'

export async function getTemplates() {
  const session = await getSession()
  if (!session) return []

  return db.query.templates.findMany({
    where: or(eq(templates.userId, session.user.id), isNull(templates.userId)),
    orderBy: (t, { asc }) => [asc(t.name)],
  })
}

export async function createTemplate(name: string, description: string, content: string) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }

  const [template] = await db
    .insert(templates)
    .values({ userId: session.user.id, name: trimmed, description, content })
    .returning()

  return { template }
}

export async function deleteTemplate(templateId: string) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  await db
    .delete(templates)
    .where(eq(templates.id, templateId))

  return { success: true }
}

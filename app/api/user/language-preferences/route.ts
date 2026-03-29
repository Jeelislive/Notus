import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { preferredLanguage, transcriptionLanguage } = await request.json()

  try {
    await db
      .update(profiles)
      .set({
        preferredLanguage: preferredLanguage || 'en',
        transcriptionLanguage: transcriptionLanguage || 'auto',
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update language preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}

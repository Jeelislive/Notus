import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, session.user.id),
      columns: { preferredLanguage: true, transcriptionLanguage: true }
    })

    return NextResponse.json({
      preferredLanguage: profile?.preferredLanguage || 'en',
      transcriptionLanguage: profile?.transcriptionLanguage || 'auto'
    })
  } catch (error) {
    console.error('Failed to get language preferences:', error)
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
  }
}

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

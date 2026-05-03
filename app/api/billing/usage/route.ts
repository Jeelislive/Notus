import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserUsage, FREE_MINUTES } from '@/lib/billing'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const usage = await getUserUsage(session.user.id)
  return NextResponse.json({ ...usage, freeLimit: FREE_MINUTES, userEmail: session.user.email, userName: session.user.name ?? '' })
}

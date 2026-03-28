import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// Returns the Deepgram API key for authenticated users so the browser can
// open a WebSocket directly. The key never appears in client-side source —
// it only arrives after a successful session check on our server.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.DEEPGRAM_API_KEY
  if (!key) return NextResponse.json({ error: 'Deepgram not configured' }, { status: 500 })

  return NextResponse.json({ token: key })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, transcriptSegments } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, messages } = await request.json()
  if (!meetingId || !messages) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const segments = await db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(asc(transcriptSegments.startMs))

  const transcript = segments.map((s) => `${s.speaker ?? 'Speaker'}: ${s.content}`).join('\n')

  const systemPrompt = transcript
    ? `You are a helpful assistant with access to this meeting transcript. Answer questions about it concisely and accurately. If asked about something not in the transcript, say so.\n\nMeeting: "${meeting.title}"\n\nTranscript:\n${transcript}`
    : `You are a helpful meeting assistant. The meeting "${meeting.title}" has no transcript yet.`

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10), // Last 10 messages for context
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.5,
      max_tokens: 1024,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[AI chat] Groq error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  // Stream the response
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

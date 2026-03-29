import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, transcriptSegments } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

async function groqChat(messages: { role: string; content: string }[], temperature = 0.3) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json() as { meetingId: string }
  if (!meetingId) return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 })

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const segments = await db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(asc(transcriptSegments.startMs))

  if (!segments.length) {
    return NextResponse.json({ error: 'No transcript available for this meeting' }, { status: 422 })
  }

  const transcript = segments
    .map(s => `[${s.speaker ?? 'Speaker'}]: ${s.content}`)
    .join('\n')

  const prompt = `You are a meeting notes assistant. Read this meeting transcript and produce clean, structured notes in HTML format.

Rules:
- Use <h2> for section headings
- Use <ul><li> bullet points for all content - no prose paragraphs
- Be concise: each bullet is 1 short sentence
- Sections to include (only include a section if the meeting has relevant content):
  1. Key Discussion Points
  2. Decisions Made
  3. Action Items (format: "Task description - Person responsible" if clear from context)
  4. Open Questions / Blockers
  5. Next Steps
- Return ONLY the HTML - no markdown fences, no explanation, no wrapping tags like <html> or <body>
- Start directly with the first <h2>

Example output format:
<h2>Key Discussion Points</h2>
<ul>
<li>Discussed timeline for the Q2 release</li>
<li>Reviewed customer feedback from last sprint</li>
</ul>
<h2>Action Items</h2>
<ul>
<li>Fix authentication bug - Alex</li>
<li>Update API documentation - Sam</li>
</ul>

Transcript:
${transcript.slice(0, 14000)}`

  try {
    const raw = await groqChat([{ role: 'user', content: prompt }])
    // Strip any accidental markdown fences
    const html = raw.trim().replace(/^```html?\n?/, '').replace(/\n?```$/, '')
    return NextResponse.json({ html })
  } catch (err) {
    console.error('[notes-fill] Error:', err)
    return NextResponse.json({ error: 'AI failed to generate notes' }, { status: 500 })
  }
}

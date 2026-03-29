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

interface SectionInput { id: string; title: string }

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, sections, currentUserName } = await request.json() as {
    meetingId: string
    sections: SectionInput[]
    currentUserName: string
  }

  if (!meetingId || !sections?.length) {
    return NextResponse.json({ error: 'Missing meetingId or sections' }, { status: 400 })
  }

  // Verify ownership
  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch transcript
  const segments = await db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(asc(transcriptSegments.startMs))

  if (!segments.length) {
    return NextResponse.json({ error: 'No transcript available for this meeting' }, { status: 422 })
  }

  // Build unique speaker list
  const speakers = [...new Set(segments.map(s => s.speaker).filter(Boolean))]

  const transcript = segments
    .map(s => `[${s.speaker ?? 'Unknown'}]: ${s.content}`)
    .join('\n')

  // Build the JSON shape example so the model sees exactly what to return
  const exampleShape = '{\n  "sections": {\n' +
    sections.map(s => `    "${s.id}": [{"text": "example task", "assignee": "Speaker 0", "assigneeDisplay": "Alice", "priority": "medium"}]`).join(',\n') +
    '\n  }\n}'

  const prompt = `You are analyzing a 1:1 meeting transcript between two people.
The current logged-in user is: "${currentUserName}".
Speakers in the transcript: ${speakers.join(', ')}.

Try to infer which speaker is "${currentUserName}" from context clues (name mentions, introductions, etc.).

Extract relevant items for each section below. Each section value MUST be a JSON array of task objects.

Sections:
${sections.map(s => `- id "${s.id}" → "${s.title}"`).join('\n')}

Guidelines:
- Discussion topics: topics discussed, decisions made, questions raised
- Action items: concrete tasks someone committed to doing
- Project updates: status updates on ongoing work
- Growth and development: career goals, feedback, learning topics

Each task object must have exactly these fields:
- "text": concise 1-line description (be specific, no filler phrases)
- "assignee": speaker label of the owner (e.g. "Speaker 0"), or null
- "assigneeDisplay": inferred real name if detectable from context, otherwise use the speaker label
- "priority": one of "high", "medium", "low", or null

Rules:
- Return ONLY the JSON object below - no markdown fences, no explanation, no extra keys
- Every section id must be present as a key, even if its array is empty []
- Aim for 2-5 items per section, quality over quantity

Return this exact structure with real data:
${exampleShape}

Transcript:
${transcript.slice(0, 12000)}`

  try {
    const raw = await groqChat([{ role: 'user', content: prompt }])
    const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ sections: parsed.sections ?? {} })
  } catch (err) {
    console.error('[agenda-fill] Error:', err)
    return NextResponse.json({ error: 'AI failed to generate agenda' }, { status: 500 })
  }
}

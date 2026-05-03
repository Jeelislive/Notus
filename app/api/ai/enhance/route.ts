import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, notes, transcriptSegments } from '@/lib/db/schema'
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
      max_tokens: 4096,
    }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json()
  if (!meetingId) return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 })

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
    // No transcript - just mark completed
    await db.update(meetings).set({ status: 'completed', updatedAt: new Date() }).where(eq(meetings.id, meetingId))
    return NextResponse.json({ success: true })
  }

  const transcript = segments
    .map((s) => `${s.speaker ?? 'Speaker'}: ${s.content}`)
    .join('\n')

  const structuredPrompt = `You are an expert meeting analyst. Analyze this transcript and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "overview": { "participants": ["Name1","Name2"], "type": "meeting type" },
  "decisions": [{"text":"decision text","speaker":"who said it","timestamp":"MM:SS"}],
  "openQuestions": [{"text":"question","answered":false}],
  "actionItems": [{"text":"action","assignee":"name","deadline":"when","priority":"high|medium|low"}],
  "risks": [{"text":"risk/blocker","speaker":"who","timestamp":"MM:SS"}],
  "keyQuotes": [{"text":"quote","speaker":"speaker name","timestamp":"MM:SS"}],
  "summary": "2-3 sentence plain text summary",
  "followUpEmail": "full professional follow-up email text"
}
Return ONLY the JSON object. No other text.

Transcript (with speaker labels):
${transcript}`

  try {
    const rawResponse = await groqChat([
      { role: 'user', content: structuredPrompt },
    ])

    // Parse the structured JSON response
    let structured: {
      overview: { participants: string[]; type: string }
      decisions: Array<{ text: string; speaker: string; timestamp: string }>
      openQuestions: Array<{ text: string; answered: boolean }>
      actionItems: Array<{ text: string; assignee: string; deadline: string; priority: string }>
      risks: Array<{ text: string; speaker: string; timestamp: string }>
      keyQuotes: Array<{ text: string; speaker: string; timestamp: string }>
      summary: string
      followUpEmail: string
    } | null = null

    try {
      const cleaned = rawResponse.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      structured = JSON.parse(cleaned)
    } catch {
      console.error('[AI enhance] Failed to parse structured JSON, falling back')
    }

    // Extract fields from structured output; fall back to raw string if parse failed
    const summaryText = structured?.summary?.trim() ?? rawResponse.trim()
    const followUpEmail = structured?.followUpEmail?.trim() ?? ''
    const actionItemStrings: string[] = structured?.actionItems?.map((a) => a.text) ?? []
    const summaryStructured = structured ? JSON.stringify(structured) : null

    // Update notes with AI content
    const existingNote = await db.query.notes.findFirst({ where: eq(notes.meetingId, meetingId) })
    if (existingNote) {
      await db.update(notes).set({
        summary: summaryText,
        summaryStructured,
        actionItems: JSON.stringify(actionItemStrings),
        followUpEmail,
        aiProcessedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(notes.meetingId, meetingId))
    }

    // Mark meeting completed
    await db.update(meetings).set({ status: 'completed', updatedAt: new Date() }).where(eq(meetings.id, meetingId))

    return NextResponse.json({
      success: true,
      summary: summaryText,
      actionItems: JSON.stringify(actionItemStrings),
      summaryStructured,
      followUpEmail,
    })
  } catch (err) {
    console.error('[AI enhance] Error:', err)
    // Still mark completed even on AI failure
    await db.update(meetings).set({ status: 'completed', updatedAt: new Date() }).where(eq(meetings.id, meetingId))
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
  }
}

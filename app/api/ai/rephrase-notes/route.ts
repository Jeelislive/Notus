import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, notes, transcriptSegments } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, content, useGroq } = await request.json()
  if (!meetingId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const [meeting, segments] = await Promise.all([
    db.query.meetings.findFirst({
      where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
    }),
    db.select().from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(asc(transcriptSegments.startMs)),
  ])
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const transcriptText = segments.length > 0
    ? segments.map((s) => `${s.speaker ? `[${s.speaker}] ` : ''}${s.content}`).join('\n')
    : ''

  const rawNotes = content ? content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''

  if (!rawNotes && !transcriptText) {
    return NextResponse.json({ error: 'No content to process' }, { status: 400 })
  }

  const context = [
    rawNotes ? `EXISTING NOTES:\n${rawNotes}` : '',
    transcriptText ? `TRANSCRIPT:\n${transcriptText}` : '',
  ].filter(Boolean).join('\n\n---\n\n')

  const prompt = `You are an expert meeting notes writer. Based on the meeting context below, generate comprehensive, detailed, and perfectly structured meeting notes.

REQUIREMENTS:
- Write detailed, professional notes that capture everything important
- Structure with clear sections using <h2> for main sections and <h3> for subsections
- Every section must have detailed bullet points — not vague one-liners, real substance
- Include these sections if relevant: Overview, Key Discussion Points, Decisions Made, Action Items, Open Questions
- Action items must name who is responsible (if known) and any deadline
- Capture important quotes or specific details verbatim where valuable
- Add your own structure and insight — don't just copy, synthesize and expand
- Return ONLY valid HTML: <h2>, <h3>, <p>, <ul><li>, <ol><li>, <strong>, <em>
- No markdown, no code fences, no commentary outside the HTML

${context}`

  let raw = ''

  if (!useGroq) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        raw = data.content?.[0]?.text ?? ''
      } else {
        console.warn('[Notes AI] Anthropic failed, falling back to Groq:', res.status)
      }
    } catch (e) {
      console.warn('[Notes AI] Anthropic error, falling back to Groq:', e)
    }
  }

  if (!raw) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
    const data = await res.json()
    raw = data.choices?.[0]?.message?.content ?? ''
  }

  const html = raw.replace(/^```html?\n?/, '').replace(/\n?```$/, '').trim()

  const note = await db.query.notes.findFirst({ where: eq(notes.meetingId, meetingId) })
  if (note) {
    await db.update(notes).set({ content: html, updatedAt: new Date() }).where(eq(notes.meetingId, meetingId))
  }

  return NextResponse.json({ html })
}

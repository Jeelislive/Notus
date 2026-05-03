import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, notes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { meetingId, notesContent } = await request.json()
  if (!meetingId) return new Response('Missing meetingId', { status: 400 })

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return new Response('Not found', { status: 404 })

  const plainNotes = (notesContent ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plainNotes) return new Response('No notes content', { status: 400 })

  const prompt = `You are a professional assistant. Write a concise, professional follow-up email based on the meeting notes below.

RULES:
- Address relevant participants if names are mentioned
- Summarize key decisions and next steps
- Keep it brief — 3 to 5 short paragraphs max
- Use a warm but professional tone
- End with a clear sign-off
- Output plain text only — no markdown, no HTML

MEETING TITLE: ${meeting.title}

MEETING NOTES:
${plainNotes}`

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    }),
  })

  if (!groqRes.ok || !groqRes.body) {
    return new Response('AI failed', { status: 500 })
  }

  const encoder = new TextEncoder()
  let fullText = ''
  const meetingIdCopy = meetingId

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
              if (delta) {
                fullText += delta
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } finally {
        // Save to DB after streaming completes
        if (fullText) {
          const note = await db.query.notes.findFirst({ where: eq(notes.meetingId, meetingIdCopy) })
          if (note) {
            await db.update(notes)
              .set({ followUpEmail: fullText.trim(), updatedAt: new Date() })
              .where(eq(notes.meetingId, meetingIdCopy))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

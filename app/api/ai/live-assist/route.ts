import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

interface RecentSegment {
  speaker: string
  content: string
  startMs: number
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    meetingId?: string
    recentSegments?: RecentSegment[]
    meetingTitle?: string
  }

  const { meetingId, recentSegments, meetingTitle } = body

  if (!meetingId || !recentSegments?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const segmentsText = recentSegments
    .map((s) => `${s.speaker}: ${s.content}`)
    .join('\n')

  const userPrompt = `Recent transcript:
${segmentsText}

Meeting: ${meetingTitle ?? 'Untitled'}

Return JSON: { suggestions: [{type, text, color}], highlightedSegments: [{content (exact text from transcript), type}] }
Suggestion types: 'suggestion' (purple, proactive question to ask), 'context' (blue, relevant background), 'contradiction' (red, something contradicts common sense)
Highlight types: decision (green), question (blue), action (orange), risk (amber), agreement (purple)
Return max 3 suggestions and highlight the most important segments. Return ONLY the JSON.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a real-time meeting assistant. Analyze the recent transcript and return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    })

    if (!res.ok) {
      console.error('[live-assist] Groq error:', res.status)
      return NextResponse.json({ error: 'AI error' }, { status: 500 })
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const raw = data.choices[0]?.message?.content ?? '{}'

    let parsed: {
      suggestions?: Array<{ type: string; text: string; color: string }>
      highlightedSegments?: Array<{ content: string; type: string }>
    } = {}

    try {
      const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[live-assist] JSON parse failed:', raw)
    }

    return NextResponse.json({
      suggestions: parsed.suggestions ?? [],
      highlightedSegments: parsed.highlightedSegments ?? [],
    })
  } catch (err) {
    console.error('[live-assist] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

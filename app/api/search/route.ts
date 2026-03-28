import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, notes, transcriptSegments } from '@/lib/db/schema'
import { eq, ilike, inArray } from 'drizzle-orm'

export interface SearchResult {
  meetingId: string
  meetingTitle: string
  meetingDate: string | null
  type: 'title' | 'note' | 'transcript'
  snippet: string
  speakerLabel?: string
}

function extractSnippet(text: string, query: string): string {
  const lower = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lower.indexOf(lowerQuery)
  if (idx === -1) {
    return text.slice(0, 150) + (text.length > 150 ? '...' : '')
  }
  const start = Math.max(0, idx - 60)
  const end = Math.min(text.length, idx + query.length + 90)
  const snippet = text.slice(start, end)
  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
}

async function runSearch(userId: string, keyword: string): Promise<SearchResult[]> {
  const userMeetings = await db
    .select({ id: meetings.id, title: meetings.title, createdAt: meetings.createdAt, startedAt: meetings.startedAt })
    .from(meetings)
    .where(eq(meetings.userId, userId))

  if (userMeetings.length === 0) return []

  const meetingIds = userMeetings.map((m) => m.id)
  const meetingMap = new Map(
    userMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      date: (m.startedAt ?? m.createdAt)?.toISOString() ?? null,
    })).map((m) => [m.id, m])
  )

  const pattern = `%${keyword}%`

  const [titleMatches, noteMatches, transcriptMatches] = await Promise.all([
    // 1. Meeting titles
    db
      .select({ id: meetings.id, title: meetings.title, createdAt: meetings.createdAt, startedAt: meetings.startedAt })
      .from(meetings)
      .where(ilike(meetings.title, pattern))
      .limit(20),

    // 2. Notes content
    db
      .select({ meetingId: notes.meetingId, content: notes.content })
      .from(notes)
      .where(ilike(notes.content, pattern))
      .limit(40),

    // 3. Transcript segments
    db
      .select({ meetingId: transcriptSegments.meetingId, content: transcriptSegments.content, speaker: transcriptSegments.speaker })
      .from(transcriptSegments)
      .where(ilike(transcriptSegments.content, pattern))
      .limit(60),
  ])

  // Build results map: one result per meetingId, best match wins
  const resultMap = new Map<string, SearchResult>()

  for (const m of titleMatches) {
    const meta = meetingMap.get(m.id)
    if (!meta) continue
    if (!resultMap.has(m.id)) {
      resultMap.set(m.id, {
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: (m.startedAt ?? m.createdAt)?.toISOString() ?? null,
        type: 'title',
        snippet: extractSnippet(m.title, keyword),
      })
    }
  }

  for (const n of noteMatches) {
    const meta = meetingMap.get(n.meetingId)
    if (!meta) continue
    if (!resultMap.has(n.meetingId)) {
      resultMap.set(n.meetingId, {
        meetingId: n.meetingId,
        meetingTitle: meta.title,
        meetingDate: meta.date,
        type: 'note',
        snippet: extractSnippet(n.content, keyword),
      })
    }
  }

  for (const t of transcriptMatches) {
    const meta = meetingMap.get(t.meetingId)
    if (!meta) continue
    // Only add transcript result if no higher-priority match exists for this meeting
    if (!resultMap.has(t.meetingId)) {
      resultMap.set(t.meetingId, {
        meetingId: t.meetingId,
        meetingTitle: meta.title,
        meetingDate: meta.date,
        type: 'transcript',
        snippet: extractSnippet(t.content, keyword),
        speakerLabel: t.speaker ?? undefined,
      })
    }
  }

  return Array.from(resultMap.values()).slice(0, 20)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const aiMode = searchParams.get('ai') === 'true'

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  let keyword = q

  // AI mode: ask Groq to extract best search keywords from natural language
  if (aiMode && process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
              content:
                'You extract the single most important search keyword from a natural language query. Return ONLY the keyword or short phrase (2-4 words max), nothing else. No punctuation, no explanation.',
            },
            { role: 'user', content: q },
          ],
          temperature: 0.1,
          max_tokens: 20,
        }),
      })

      if (groqRes.ok) {
        const groqData = await groqRes.json()
        const extracted = groqData.choices?.[0]?.message?.content?.trim()
        if (extracted && extracted.length > 0 && extracted.length < 100) {
          keyword = extracted
        }
      }
    } catch {
      // Fall back to raw query if Groq fails
    }
  }

  const results = await runSearch(session.user.id, keyword)
  return NextResponse.json({ results, keyword })
}

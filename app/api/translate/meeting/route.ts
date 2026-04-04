import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, transcriptSegments, notes } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getMeetingTranslation, upsertMeetingTranslation } from '@/lib/db/queries'

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  bn: 'Bengali',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
  ar: 'Arabic',
}

async function groqChat(messages: { role: string; content: string }[]) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.1,
      max_tokens: 8000,
    }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId, targetLanguage } = await request.json()
  if (!meetingId || !targetLanguage) {
    return NextResponse.json({ error: 'Missing meetingId or targetLanguage' }, { status: 400 })
  }
  if (targetLanguage === 'en') {
    return NextResponse.json({ error: 'English is the source language' }, { status: 400 })
  }

  const langName = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage

  // Check cache first
  const cached = await getMeetingTranslation(meetingId, targetLanguage)
  if (cached) {
    return NextResponse.json({ cached: true, translation: cached })
  }

  // Verify meeting is accessible by this user
  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.id, meetingId),
  })
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch transcript segments
  const segments = await db
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, meetingId))
    .orderBy(asc(transcriptSegments.startMs))

  // Fetch note (AI summary, actions, email)
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.meetingId, meetingId)),
  })

  let translatedTranscript: string | null = null
  let translatedSummary: string | null = null
  let translatedStructured: string | null = null
  let translatedActionItems: string | null = null
  let translatedEmail: string | null = null

  // ── Translate transcript segments ────────────────────────────────────────
  if (segments.length > 0) {
    const segmentList = segments
      .map((s) => `${s.id}|||${s.content}`)
      .join('\n')

    const transcriptPrompt = `You are a professional translator. Translate the following meeting transcript segments to ${langName}.
Rules:
- Translate ONLY the text after "|||" on each line
- Keep the ID before "|||" exactly as-is
- Preserve natural conversational tone
- Keep speaker names, technical terms, and proper nouns unchanged
- Return ONLY the translated lines in the same format, nothing else

Format: ID|||translated text

Segments:
${segmentList}`

    try {
      const raw = await groqChat([{ role: 'user', content: transcriptPrompt }])
      const lines = raw.trim().split('\n').filter((l: string) => l.includes('|||'))
      const map: Record<string, string> = {}
      for (const line of lines) {
        const idx = line.indexOf('|||')
        if (idx !== -1) {
          const id = line.slice(0, idx).trim()
          const content = line.slice(idx + 3).trim()
          if (id && content) map[id] = content
        }
      }
      // Build translated segment array preserving original structure
      const translated = segments.map((s) => ({
        id: s.id,
        content: map[s.id] ?? s.content,
      }))
      translatedTranscript = JSON.stringify(translated)
    } catch (e) {
      console.error('[Translate] transcript error', e)
    }
  }

  // ── Translate AI summary fields ───────────────────────────────────────────
  if (note && (note.summary || note.actionItems || note.followUpEmail)) {
    const summaryPrompt = `You are a professional translator. Translate the following meeting summary content to ${langName}.
Return ONLY valid JSON in exactly this format, no other text:
{
  "summary": "translated summary text",
  "actionItems": ["translated item 1", "translated item 2"],
  "followUpEmail": "translated email text"
}

If a field is null or empty, keep it as null in the response.

Source content:
Summary: ${note.summary ?? ''}
Action Items (JSON array): ${note.actionItems ?? '[]'}
Follow-up Email: ${note.followUpEmail ?? ''}`

    try {
      const raw = await groqChat([{ role: 'user', content: summaryPrompt }])
      const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      const parsed = JSON.parse(cleaned)
      if (note.summary) translatedSummary = parsed.summary ?? null
      if (note.actionItems) translatedActionItems = JSON.stringify(parsed.actionItems ?? [])
      if (note.followUpEmail) translatedEmail = parsed.followUpEmail ?? null
    } catch (e) {
      console.error('[Translate] summary error', e)
    }
  }

  // ── Translate structured JSON ─────────────────────────────────────────────
  if (note?.summaryStructured) {
    try {
      const structured = JSON.parse(note.summaryStructured)
      const structuredPrompt = `You are a professional translator. Translate all text values in the following JSON to ${langName}.
Rules:
- Translate ONLY text values — keep all keys, numbers, booleans, and structure identical
- Speaker names (name fields): keep unchanged
- Timestamps (timestamp fields like "02:15"): keep unchanged
- Priority values ("high", "medium", "low"): keep unchanged
- answered/boolean fields: keep unchanged
- Return ONLY valid JSON, no other text

JSON to translate:
${JSON.stringify(structured, null, 2)}`

      const raw = await groqChat([{ role: 'user', content: structuredPrompt }])
      const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      const parsedStructured = JSON.parse(cleaned)
      translatedStructured = JSON.stringify(parsedStructured)
    } catch (e) {
      console.error('[Translate] structured error', e)
    }
  }

  // ── Cache the translation ─────────────────────────────────────────────────
  await upsertMeetingTranslation(meetingId, targetLanguage, {
    transcript: translatedTranscript ?? undefined,
    summary: translatedSummary ?? undefined,
    summaryStructured: translatedStructured ?? undefined,
    actionItems: translatedActionItems ?? undefined,
    followUpEmail: translatedEmail ?? undefined,
  })

  const translation = await getMeetingTranslation(meetingId, targetLanguage)
  return NextResponse.json({ cached: false, translation })
}

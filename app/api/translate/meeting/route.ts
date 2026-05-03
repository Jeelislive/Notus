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

  const [meeting, segments, note] = await Promise.all([
    db.query.meetings.findFirst({ where: eq(meetings.id, meetingId) }),
    db.select().from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(asc(transcriptSegments.startMs)),
    db.query.notes.findFirst({ where: eq(notes.meetingId, meetingId) }),
  ])
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Build all prompts upfront, then fire all Groq calls in parallel
  const transcriptPrompt = segments.length > 0 ? `You are a professional translator. Translate the following meeting transcript segments to ${langName}.
Rules:
- Translate ONLY the text after "|||" on each line
- Keep the ID before "|||" exactly as-is
- Preserve natural conversational tone
- Keep speaker names, technical terms, and proper nouns unchanged
- Return ONLY the translated lines in the same format, nothing else

Format: ID|||translated text

Segments:
${segments.map((s) => `${s.id}|||${s.content}`).join('\n')}` : null

  const summaryPrompt = note && (note.summary || note.actionItems || note.followUpEmail) ? `You are a professional translator. Translate the following meeting summary content to ${langName}.
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
Follow-up Email: ${note.followUpEmail ?? ''}` : null

  const structuredPrompt = note?.summaryStructured ? `You are a professional translator. Translate all text values in the following JSON to ${langName}.
Rules:
- Translate ONLY text values — keep all keys, numbers, booleans, and structure identical
- Speaker names, timestamps, priority values ("high","medium","low"), booleans: keep unchanged
- Return ONLY valid JSON, no other text

JSON to translate:
${note.summaryStructured}` : null

  // Fire all three Groq calls in parallel
  const [transcriptRaw, summaryRaw, structuredRaw] = await Promise.all([
    transcriptPrompt ? groqChat([{ role: 'user', content: transcriptPrompt }]).catch((e) => { console.error('[Translate] transcript error', e); return null }) : Promise.resolve(null),
    summaryPrompt ? groqChat([{ role: 'user', content: summaryPrompt }]).catch((e) => { console.error('[Translate] summary error', e); return null }) : Promise.resolve(null),
    structuredPrompt ? groqChat([{ role: 'user', content: structuredPrompt }]).catch((e) => { console.error('[Translate] structured error', e); return null }) : Promise.resolve(null),
  ])

  let translatedTranscript: string | null = null
  let translatedSummary: string | null = null
  let translatedStructured: string | null = null
  let translatedActionItems: string | null = null
  let translatedEmail: string | null = null

  if (transcriptRaw) {
    const lines = transcriptRaw.trim().split('\n').filter((l: string) => l.includes('|||'))
    const map: Record<string, string> = {}
    for (const line of lines) {
      const idx = line.indexOf('|||')
      if (idx !== -1) {
        const id = line.slice(0, idx).trim()
        const content = line.slice(idx + 3).trim()
        if (id && content) map[id] = content
      }
    }
    translatedTranscript = JSON.stringify(segments.map((s) => ({ id: s.id, content: map[s.id] ?? s.content })))
  }

  if (summaryRaw && note) {
    try {
      const parsed = JSON.parse(summaryRaw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''))
      if (note.summary) translatedSummary = parsed.summary ?? null
      if (note.actionItems) translatedActionItems = JSON.stringify(parsed.actionItems ?? [])
      if (note.followUpEmail) translatedEmail = parsed.followUpEmail ?? null
    } catch (e) { console.error('[Translate] summary parse error', e) }
  }

  if (structuredRaw) {
    try {
      const parsed = JSON.parse(structuredRaw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''))
      translatedStructured = JSON.stringify(parsed)
    } catch (e) { console.error('[Translate] structured parse error', e) }
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

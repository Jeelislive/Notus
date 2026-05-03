import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, transcriptSegments } from '@/lib/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { messages } = body
  // Support both single meetingId and multiple meetingIds
  const meetingIds: string[] = body.meetingIds ?? (body.meetingId ? [body.meetingId] : [])
  const folderName: string | undefined = body.folderName
  const folderDescription: string | undefined = body.folderDescription
  const meetingTitles: string[] | undefined = body.meetingTitles

  if (!messages) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const meetingTitle: string | undefined = body.meetingTitle

  const folderPrefix = folderName
    ? `You are Notus, an AI assistant scoped to the "${folderName}" folder${folderDescription ? ` — ${folderDescription}` : ''}. `
    : meetingTitle
      ? `You are Notus, an AI assistant scoped to the meeting "${meetingTitle}". `
      : 'You are Notus, a helpful meeting assistant. '

  let systemPrompt: string

  if (meetingIds.length === 0) {
    const meetingInfo = meetingTitles?.length
      ? `This folder currently has no meetings with transcripts yet. Meetings in this folder: ${meetingTitles.join(', ')}.`
      : 'This folder currently has no meetings.'
    systemPrompt = `${folderPrefix}${meetingInfo} Answer questions helpfully and let the user know when transcript data is not yet available.`
  } else {
    // Verify ownership of all requested meetings and fetch segments concurrently
    const [ownedMeetings, allSegsRaw] = await Promise.all([
      db
        .select()
        .from(meetings)
        .where(and(inArray(meetings.id, meetingIds), eq(meetings.userId, session.user.id))),
      db
        .select()
        .from(transcriptSegments)
        .where(inArray(transcriptSegments.meetingId, meetingIds))
        .orderBy(asc(transcriptSegments.startMs)),
    ])

    if (!ownedMeetings.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isMulti = ownedMeetings.length > 1

    const ownedIds = new Set(ownedMeetings.map((m) => m.id))
    const allSegs = allSegsRaw.filter((s) => ownedIds.has(s.meetingId))

    const segMap: Record<string, typeof allSegs> = {}
    for (const s of allSegs) {
      if (!segMap[s.meetingId]) segMap[s.meetingId] = []
      segMap[s.meetingId].push(s)
    }

    if (isMulti) {
      const meetingBlocks = ownedMeetings.map((m) => {
        const segs = segMap[m.id] ?? []
        const transcript = segs.map((s) => `${s.speaker ?? 'Speaker'}: ${s.content}`).join('\n')
        const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''
        return transcript
          ? `## Meeting: "${m.title}" (${date})\n${transcript}`
          : `## Meeting: "${m.title}" (${date})\n[No transcript available]`
      }).join('\n\n---\n\n')
      systemPrompt = `${folderPrefix}You have access to ${ownedMeetings.length} meeting transcripts in this folder. Answer questions by synthesising across all of them. Cite which meeting you're referencing when relevant. Be concise and accurate.\n\n${meetingBlocks}`
    } else {
      const meeting = ownedMeetings[0]
      const transcript = (segMap[meeting.id] ?? []).map((s) => `${s.speaker ?? 'Speaker'}: ${s.content}`).join('\n')
      systemPrompt = transcript
        ? `${folderPrefix}You have access to this meeting transcript. Answer questions about it concisely and accurately. If asked about something not in the transcript, say so.\n\nMeeting: "${meeting.title}"\n\nTranscript:\n${transcript}`
        : `${folderPrefix}The meeting "${meeting.title}" has no transcript yet. Let the user know and answer general questions helpfully.`
    }
  }

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10),
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

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

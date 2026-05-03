import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { meetings, folders } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// ANALYZE ONLY — no DB writes. Returns a proposed action for the client to confirm.
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { folderId, folderName, folderDescription, message } = body

  if (!folderId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const [folderRows, allMeetings] = await Promise.all([
    db.select().from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, session.user.id)))
      .limit(1),
    db.select({ id: meetings.id, title: meetings.title, folderId: meetings.folderId, status: meetings.status, createdAt: meetings.createdAt, durationSeconds: meetings.durationSeconds })
      .from(meetings)
      .where(eq(meetings.userId, session.user.id))
      .orderBy(desc(meetings.createdAt))
      .limit(50),
  ])
  const folder = folderRows
  if (!folder[0]) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

  const meetingList = allMeetings.length
    ? allMeetings
        .map((m) => `- ID: ${m.id} | Title: "${m.title}" | In this folder: ${m.folderId === folderId ? 'yes (already here)' : m.folderId ? 'no (in another folder)' : 'no'}`)
        .join('\n')
    : '(No meetings found)'

  const systemPrompt = `You are Notus, an AI assistant helping organize meetings into folders.

Folder: "${folderName}"${folderDescription ? ` — ${folderDescription}` : ''}

All user meetings:
${meetingList}

Analyze the user's request and decide:
1. If they want to move meetings → call proposeMeetingMove with the relevant meeting IDs (excluding ones already in this folder).
2. If they want to remove meetings from this folder → call proposeRemoveMeetings with the meeting IDs to remove.
3. If it's a general question (not an action) → call chatReply with a helpful response.

Be conservative: only include meetings that are clearly relevant. Explain your reasoning clearly.`

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'proposeMeetingMove',
        description: 'Propose moving specific meetings INTO this folder. Use when user wants to add/move meetings here.',
        parameters: {
          type: 'object',
          properties: {
            meetingIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of meetings to move into this folder. Must NOT already be in this folder.',
            },
            reasoning: {
              type: 'string',
              description: 'Explain clearly which meetings you selected and why they are relevant to this folder.',
            },
          },
          required: ['meetingIds', 'reasoning'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'proposeRemoveMeetings',
        description: 'Propose removing specific meetings FROM this folder (they stay as meetings, just unassigned from the folder).',
        parameters: {
          type: 'object',
          properties: {
            meetingIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of meetings to remove from this folder.',
            },
            reasoning: {
              type: 'string',
              description: 'Explain which meetings you are removing and why.',
            },
          },
          required: ['meetingIds', 'reasoning'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'chatReply',
        description: 'Use for general questions or when no action is needed.',
        parameters: {
          type: 'object',
          properties: {
            reply: { type: 'string', description: 'The response to send to the user.' },
          },
          required: ['reply'],
        },
      },
    },
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 768,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[folder-agent] Groq error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const toolCall = choice?.message?.tool_calls?.[0]

  // No tool call → plain chat reply
  if (!toolCall) {
    return NextResponse.json({ type: 'chat', reply: choice?.message?.content ?? 'No response.' })
  }

  let args: Record<string, unknown>
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const toolName = toolCall.function.name

  if (toolName === 'chatReply') {
    return NextResponse.json({ type: 'chat', reply: args.reply as string })
  }

  if (toolName === 'proposeMeetingMove') {
    const meetingIds = (args.meetingIds as string[]) ?? []
    // Resolve meeting details for the confirmation card (filter to valid, non-already-assigned)
    const proposed = allMeetings
      .filter((m) => meetingIds.includes(m.id) && m.folderId !== folderId)
      .map((m) => ({ id: m.id, title: m.title, status: m.status, createdAt: m.createdAt, durationSeconds: m.durationSeconds }))

    return NextResponse.json({
      type: 'action',
      action: {
        kind: 'move_to_folder',
        folderId,
        folderName,
        meetings: proposed,
        reasoning: args.reasoning as string,
        label: proposed.length === 0
          ? 'No relevant meetings found'
          : `Move ${proposed.length} meeting${proposed.length !== 1 ? 's' : ''} into "${folderName}"`,
      },
    })
  }

  if (toolName === 'proposeRemoveMeetings') {
    const meetingIds = (args.meetingIds as string[]) ?? []
    const proposed = allMeetings
      .filter((m) => meetingIds.includes(m.id) && m.folderId === folderId)
      .map((m) => ({ id: m.id, title: m.title, status: m.status, createdAt: m.createdAt, durationSeconds: m.durationSeconds }))

    return NextResponse.json({
      type: 'action',
      action: {
        kind: 'remove_from_folder',
        folderId,
        folderName,
        meetings: proposed,
        reasoning: args.reasoning as string,
        label: proposed.length === 0
          ? 'No meetings to remove'
          : `Remove ${proposed.length} meeting${proposed.length !== 1 ? 's' : ''} from "${folderName}"`,
      },
    })
  }

  return NextResponse.json({ type: 'chat', reply: 'I\'m not sure how to help with that.' })
}

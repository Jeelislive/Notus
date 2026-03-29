import { log } from '@/lib/logger'

const logger = log('notion')

export async function testNotionConnection(
  apiKey: string
): Promise<{ ok: boolean; error?: string; workspaceName?: string }> {
  logger.info('Testing connection')
  try {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error('Auth check failed', { status: res.status, body })
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as { bot?: { workspace_name?: string } }
    logger.info('Connection OK', { workspace: data.bot?.workspace_name })
    return { ok: true, workspaceName: data.bot?.workspace_name }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Connection threw', { error: msg })
    return { ok: false, error: msg }
  }
}

export async function exportToNotion(
  apiKey: string,
  pageId: string,
  meeting: {
    title: string
    summary?: string
    content?: string
    actionItems?: string
    date: string
  }
) {
  logger.info('Exporting meeting', { pageId, meetingTitle: meeting.title, hasSummary: !!meeting.summary, hasActionItems: !!meeting.actionItems })

  const children: unknown[] = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📋 Meeting Notes' } }] },
    },
  ]

  if (meeting.summary) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: meeting.summary } }] },
    })
  }

  if (meeting.actionItems) {
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ type: 'text', text: { content: '✅ Action Items' } }] },
    })
    for (const item of meeting.actionItems.split('\n').filter(Boolean)) {
      children.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: item.replace(/^[-•*]\s*/, '') } }],
          checked: false,
        },
      })
    }
  }

  const body = {
    parent: { page_id: pageId },
    properties: {
      title: { title: [{ text: { content: `${meeting.title} - ${meeting.date}` } }] },
    },
    children,
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error('Export failed', { status: res.status, error: err, pageId, meetingTitle: meeting.title })
      return { ok: false, error: err }
    }

    const data = (await res.json()) as { url: string }
    logger.info('Export OK', { pageUrl: data.url, meetingTitle: meeting.title })
    return { ok: true, url: data.url }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Export threw', { error: msg, meetingTitle: meeting.title })
    return { ok: false, error: msg }
  }
}

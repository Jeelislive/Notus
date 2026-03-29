export async function testNotionConnection(
  apiKey: string
): Promise<{ ok: boolean; error?: string; workspaceName?: string }> {
  try {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = (await res.json()) as { bot?: { workspace_name?: string } }
    return { ok: true, workspaceName: data.bot?.workspace_name }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
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
      title: { title: [{ text: { content: `${meeting.title} — ${meeting.date}` } }] },
    },
    children,
  }

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
    return { ok: false, error: err }
  }
  const data = (await res.json()) as { url: string }
  return { ok: true, url: data.url }
}

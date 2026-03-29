export async function testSlackWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '✅ Notus connected successfully!' }),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postToSlack(
  webhookUrl: string,
  meeting: { title: string; summary: string; actionItems?: string; date: string }
) {
  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📝 ${meeting.title}`, emoji: true },
    },
    {
      type: 'section',
      fields: [{ type: 'mrkdwn', text: `*Date:*\n${meeting.date}` }],
    },
  ]

  if (meeting.summary) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${meeting.summary.slice(0, 500)}${meeting.summary.length > 500 ? '…' : ''}`,
      },
    })
  }

  if (meeting.actionItems) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Action Items:*\n${meeting.actionItems.slice(0, 400)}`,
      },
    })
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })
  return { ok: res.ok, status: res.status }
}

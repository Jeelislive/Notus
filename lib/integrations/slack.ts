import { log } from '@/lib/logger'

const logger = log('slack')

export async function testSlackWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  // Mask the webhook URL in logs — only show the last 8 chars
  const maskedUrl = `hooks.slack.com/…${webhookUrl.slice(-8)}`
  logger.info('Testing webhook', { url: maskedUrl })
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '✅ Notus connected successfully!' }),
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error('Webhook test failed', { status: res.status, body })
      return { ok: false, error: `HTTP ${res.status}: ${body}` }
    }
    logger.info('Webhook test OK')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Webhook test threw', { error: msg })
    return { ok: false, error: msg }
  }
}

export async function postToSlack(
  webhookUrl: string,
  meeting: { title: string; summary: string; actionItems?: string; date: string }
) {
  logger.info('Posting to Slack', { meetingTitle: meeting.title, date: meeting.date, hasSummary: !!meeting.summary, hasActionItems: !!meeting.actionItems })

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

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error('Post failed', { status: res.status, body, meetingTitle: meeting.title })
    } else {
      logger.info('Post OK', { meetingTitle: meeting.title })
    }
    return { ok: res.ok, status: res.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Post threw', { error: msg, meetingTitle: meeting.title })
    return { ok: false, status: 0 }
  }
}

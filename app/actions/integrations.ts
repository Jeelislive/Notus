'use server'

import { db } from '@/lib/db'
import { userIntegrations, meetings, notes } from '@/lib/db/schema'
import { getSession } from '@/lib/session'
import { eq, and } from 'drizzle-orm'
import { log } from '@/lib/logger'

const logger = log('integrations')
import { testJiraConnection, createJiraIssues } from '@/lib/integrations/jira'
import { testSlackWebhook, postToSlack } from '@/lib/integrations/slack'
import { testNotionConnection, exportToNotion } from '@/lib/integrations/notion'
import { testLinearConnection, getLinearTeams, createLinearIssues } from '@/lib/integrations/linear'

type Provider = 'jira' | 'slack' | 'notion' | 'linear' | 'github'

export async function saveIntegration(provider: Provider, config: Record<string, string>) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  await db
    .insert(userIntegrations)
    .values({ userId: session.user.id, provider, config, isActive: true })
    .onConflictDoUpdate({
      target: [userIntegrations.userId, userIntegrations.provider],
      set: { config, isActive: true, updatedAt: new Date() },
    })

  return { success: true }
}

export async function deleteIntegration(provider: Provider) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  await db
    .delete(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, session.user.id),
        eq(userIntegrations.provider, provider)
      )
    )

  return { success: true }
}

export async function getIntegrations() {
  const session = await getSession()
  if (!session) return []

  return db.query.userIntegrations.findMany({
    where: eq(userIntegrations.userId, session.user.id),
  })
}

export async function testIntegrationConnection(
  provider: Provider,
  config: Record<string, string>
): Promise<{ ok: boolean; error?: string; workspaceName?: string; teamName?: string }> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Unauthorized' }

  switch (provider) {
    case 'jira':
      return testJiraConnection(config as { domain: string; email: string; apiToken: string; projectKey: string })
    case 'slack':
      return testSlackWebhook(config.webhookUrl)
    case 'notion':
      return testNotionConnection(config.apiKey)
    case 'linear':
      return testLinearConnection(config.apiKey)
    default:
      return { ok: false, error: 'Unknown provider' }
  }
}

export async function fetchLinearTeams(apiKey: string) {
  const session = await getSession()
  if (!session) return []
  return getLinearTeams(apiKey)
}

export async function pushMeetingToSlack(meetingId: string) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const integration = await db.query.userIntegrations.findFirst({
    where: and(
      eq(userIntegrations.userId, session.user.id),
      eq(userIntegrations.provider, 'slack')
    ),
  })
  if (!integration) return { error: 'Slack not connected' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  const note = await db.query.notes.findFirst({
    where: eq(notes.meetingId, meetingId),
  })

  const result = await postToSlack(integration.config.webhookUrl, {
    title: meeting.title,
    summary: note?.summary ?? '',
    actionItems: note?.actionItems ?? undefined,
    date:
      meeting.startedAt?.toLocaleDateString('en-US', { dateStyle: 'medium' }) ??
      new Date().toLocaleDateString(),
  })

  return result
}

export async function exportMeetingToNotion(meetingId: string) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const integration = await db.query.userIntegrations.findFirst({
    where: and(
      eq(userIntegrations.userId, session.user.id),
      eq(userIntegrations.provider, 'notion')
    ),
  })
  if (!integration) return { error: 'Notion not connected' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  const note = await db.query.notes.findFirst({
    where: eq(notes.meetingId, meetingId),
  })

  return exportToNotion(integration.config.apiKey, integration.config.pageId, {
    title: meeting.title,
    summary: note?.summary ?? undefined,
    content: note?.content ?? undefined,
    actionItems: note?.actionItems ?? undefined,
    date:
      meeting.startedAt?.toLocaleDateString('en-US', { dateStyle: 'medium' }) ??
      new Date().toLocaleDateString(),
  })
}

export async function pushMeetingToJira(meetingId: string, issues: { summary: string; description: string }[]) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const integration = await db.query.userIntegrations.findFirst({
    where: and(
      eq(userIntegrations.userId, session.user.id),
      eq(userIntegrations.provider, 'jira')
    ),
  })
  if (!integration) {
    logger.error('Jira not connected', { userId: session.user.id, meetingId })
    return { error: 'Jira not connected' }
  }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  // Log the config keys and values (except token) so we can debug issues
  const config = integration.config as { domain: string; email: string; apiToken: string; projectKey: string }
  logger.info('Pushing to Jira', {
    userId: session.user.id,
    meetingId,
    domain: config.domain,
    email: config.email,
    projectKey: config.projectKey,
    projectKeyLength: config.projectKey?.length ?? 0,
    issueCount: issues.length,
  })

  return createJiraIssues(config, issues)
}

export async function pushMeetingToLinear(meetingId: string, issues: { title: string; description: string }[]) {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const integration = await db.query.userIntegrations.findFirst({
    where: and(
      eq(userIntegrations.userId, session.user.id),
      eq(userIntegrations.provider, 'linear')
    ),
  })
  if (!integration) return { error: 'Linear not connected' }

  const meeting = await db.query.meetings.findFirst({
    where: and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)),
  })
  if (!meeting) return { error: 'Meeting not found' }

  return createLinearIssues(integration.config.apiKey, integration.config.teamId, issues)
}

import { log } from '@/lib/logger'

const logger = log('jira')

interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

export async function testJiraConnection(config: JiraConfig): Promise<{ ok: boolean; error?: string }> {
  logger.info('Testing connection', { domain: config.domain, projectKey: config.projectKey, email: config.email })
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')

    // 1. Verify credentials
    const meRes = await fetch(`https://${config.domain}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    if (!meRes.ok) {
      logger.error('Auth check failed', { status: meRes.status, domain: config.domain })
      return { ok: false, error: `Authentication failed (HTTP ${meRes.status}). Check your email and API token.` }
    }

    // 2. Verify the project key exists and is accessible
    if (config.projectKey) {
      const projRes = await fetch(`https://${config.domain}/rest/api/3/project/${config.projectKey.trim().toUpperCase()}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      })
      if (!projRes.ok) {
        const body = await projRes.text()
        logger.error('Project key invalid', { projectKey: config.projectKey, status: projRes.status, body })
        return { ok: false, error: `Project "${config.projectKey}" not found (HTTP ${projRes.status}). Check the project key and your permissions.` }
      }
    }

    logger.info('Connection OK', { domain: config.domain, projectKey: config.projectKey })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Connection threw', { error: msg })
    return { ok: false, error: msg }
  }
}

export async function createJiraIssues(
  config: JiraConfig,
  issues: { summary: string; description: string; issueType?: string }[]
) {
  const projectKey = config.projectKey?.trim().toUpperCase()

  logger.info('Creating issues', {
    domain: config.domain,
    projectKey,
    email: config.email,
    count: issues.length,
    summaries: issues.map(i => i.summary),
  })

  if (!projectKey) {
    logger.error('Missing projectKey', { config_keys: Object.keys(config) })
    return { created: [], errors: ['Project key is missing. Re-connect Jira in Settings → Integrations.'] }
  }

  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
  const baseUrl = `https://${config.domain}/rest/api/3/issue`
  const created: { key: string; url: string; summary: string }[] = []
  const errors: string[] = []

  for (const issue of issues) {
    // Omit priority — causes 400 on Jira instances with custom priority schemes
    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      summary: issue.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: issue.description || issue.summary }],
          },
        ],
      },
      issuetype: { name: issue.issueType || 'Task' },
    }

    logger.info('POST issue', { projectKey, summary: issue.summary, issuetype: issue.issueType || 'Task' })

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ fields }),
      })

      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        let rawBody = ''
        try {
          rawBody = await res.text()
          const body = JSON.parse(rawBody) as { errorMessages?: string[]; errors?: Record<string, string> }
          const msgs = [
            ...(body.errorMessages ?? []),
            ...Object.values(body.errors ?? {}),
          ]
          if (msgs.length) detail = msgs.join(', ')
        } catch { /* ignore parse errors */ }

        logger.error('Issue creation failed', {
          summary: issue.summary,
          status: res.status,
          detail,
          rawBody,
          projectKey,
        })
        errors.push(`"${issue.summary}": ${detail}`)
        continue
      }

      const data = (await res.json()) as { key: string }
      logger.info('Issue created', { key: data.key, summary: issue.summary })
      created.push({
        key: data.key,
        url: `https://${config.domain}/browse/${data.key}`,
        summary: issue.summary,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      logger.error('Issue request threw', { summary: issue.summary, error: msg })
      errors.push(`"${issue.summary}": ${msg}`)
    }
  }

  logger.info('Done', { created: created.length, errors: errors.length })
  return { created, errors }
}

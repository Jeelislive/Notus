interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

export async function testJiraConnection(config: JiraConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')

    // 1. Verify credentials
    const meRes = await fetch(`https://${config.domain}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    if (!meRes.ok) return { ok: false, error: `Authentication failed (HTTP ${meRes.status}). Check your email and API token.` }

    // 2. Verify the project key exists and is accessible
    if (config.projectKey) {
      const projRes = await fetch(`https://${config.domain}/rest/api/3/project/${config.projectKey}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      })
      if (!projRes.ok) {
        return { ok: false, error: `Project "${config.projectKey}" not found. Check the project key and your permissions.` }
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function createJiraIssues(
  config: JiraConfig,
  issues: { summary: string; description: string; issueType?: string }[]
) {
  if (!config.projectKey?.trim()) {
    return { created: [], errors: ['Project key is missing. Re-connect Jira in Settings → Integrations.'] }
  }

  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
  const baseUrl = `https://${config.domain}/rest/api/3/issue`
  const created: { key: string; url: string; summary: string }[] = []
  const errors: string[] = []

  for (const issue of issues) {
    // Only send the minimal required fields — omit priority to avoid
    // "priority not found" errors on Jira instances with custom schemes
    const fields: Record<string, unknown> = {
      project: { key: config.projectKey.trim().toUpperCase() },
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
        // Surface the actual Jira error message
        let detail = `HTTP ${res.status}`
        try {
          const body = await res.json() as { errorMessages?: string[]; errors?: Record<string, string> }
          const msgs = [
            ...(body.errorMessages ?? []),
            ...Object.values(body.errors ?? {}),
          ]
          if (msgs.length) detail = msgs.join(', ')
        } catch { /* ignore parse errors */ }
        errors.push(`"${issue.summary}": ${detail}`)
        continue
      }
      const data = (await res.json()) as { key: string }
      created.push({
        key: data.key,
        url: `https://${config.domain}/browse/${data.key}`,
        summary: issue.summary,
      })
    } catch (e) {
      errors.push(`"${issue.summary}": ${e instanceof Error ? e.message : 'Network error'}`)
    }
  }
  return { created, errors }
}

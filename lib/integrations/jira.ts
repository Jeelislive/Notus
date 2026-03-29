interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

export async function testJiraConnection(config: JiraConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
    const res = await fetch(`https://${config.domain}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function createJiraIssues(
  config: JiraConfig,
  issues: { summary: string; description: string; issueType?: string; priority?: string }[]
) {
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
  const baseUrl = `https://${config.domain}/rest/api/3/issue`
  const created: { key: string; url: string; summary: string }[] = []
  const errors: string[] = []

  for (const issue of issues) {
    const fields: Record<string, unknown> = {
      project: { key: config.projectKey },
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
      priority: { name: issue.priority || 'Medium' },
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
        errors.push(`${issue.summary}: ${res.status}`)
        continue
      }
      const data = (await res.json()) as { key: string }
      created.push({
        key: data.key,
        url: `https://${config.domain}/browse/${data.key}`,
        summary: issue.summary,
      })
    } catch (e) {
      errors.push(`${issue.summary}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }
  return { created, errors }
}

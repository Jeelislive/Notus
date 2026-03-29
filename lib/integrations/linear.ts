import { log } from '@/lib/logger'

const logger = log('linear')

export async function testLinearConnection(
  apiKey: string
): Promise<{ ok: boolean; error?: string; teamName?: string }> {
  logger.info('Testing connection')
  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ viewer { name } teams { nodes { id name } } }' }),
    })
    if (!res.ok) {
      const body = await res.text()
      logger.error('Auth check failed', { status: res.status, body })
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as {
      data?: { viewer?: { name?: string }; teams?: { nodes?: { id: string; name: string }[] } }
    }
    if (data.data?.viewer) {
      const teamName = data.data.teams?.nodes?.[0]?.name
      logger.info('Connection OK', { viewer: data.data.viewer.name, teamName })
      return { ok: true, teamName }
    }
    logger.error('Invalid API key — no viewer in response')
    return { ok: false, error: 'Invalid API key' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('Connection threw', { error: msg })
    return { ok: false, error: msg }
  }
}

export async function createLinearIssues(
  apiKey: string,
  teamId: string,
  issues: { title: string; description: string }[]
) {
  logger.info('Creating issues', { teamId, count: issues.length, titles: issues.map(i => i.title) })

  const created: { id: string; identifier: string; url: string; title: string }[] = []
  const errors: string[] = []

  const mutation = `
    mutation CreateIssue($teamId: String!, $title: String!, $description: String) {
      issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
        success
        issue { id identifier url title }
      }
    }
  `

  for (const issue of issues) {
    try {
      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mutation, variables: { teamId, title: issue.title, description: issue.description } }),
      })
      const data = (await res.json()) as {
        data?: { issueCreate?: { success: boolean; issue?: { id: string; identifier: string; url: string; title: string } } }
        errors?: { message: string }[]
      }
      if (data.errors?.length) {
        const msg = data.errors.map(e => e.message).join(', ')
        logger.error('Issue creation GQL error', { title: issue.title, errors: msg })
        errors.push(`"${issue.title}": ${msg}`)
      } else if (data.data?.issueCreate?.success && data.data.issueCreate.issue) {
        logger.info('Issue created', { identifier: data.data.issueCreate.issue.identifier, title: issue.title })
        created.push(data.data.issueCreate.issue)
      } else {
        logger.error('Issue creation returned no success', { title: issue.title, data })
        errors.push(`"${issue.title}": creation failed`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      logger.error('Issue request threw', { title: issue.title, error: msg })
      errors.push(`"${issue.title}": ${msg}`)
    }
  }

  logger.info('Done', { created: created.length, errors: errors.length })
  return { created, errors }
}

export async function getLinearTeams(apiKey: string) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ teams { nodes { id name key } } }' }),
  })
  const data = (await res.json()) as {
    data?: { teams?: { nodes?: { id: string; name: string; key: string }[] } }
  }
  return data.data?.teams?.nodes ?? []
}

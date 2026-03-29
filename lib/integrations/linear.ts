export async function testLinearConnection(
  apiKey: string
): Promise<{ ok: boolean; error?: string; teamName?: string }> {
  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { name } teams { nodes { id name } } }' }),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = (await res.json()) as {
      data?: {
        viewer?: { name?: string }
        teams?: { nodes?: { id: string; name: string }[] }
      }
    }
    if (data.data?.viewer) {
      return { ok: true, teamName: data.data.teams?.nodes?.[0]?.name }
    }
    return { ok: false, error: 'Invalid API key' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function createLinearIssues(
  apiKey: string,
  teamId: string,
  issues: { title: string; description: string }[]
) {
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
        body: JSON.stringify({
          query: mutation,
          variables: { teamId, title: issue.title, description: issue.description },
        }),
      })
      const data = (await res.json()) as {
        data?: {
          issueCreate?: {
            success: boolean
            issue?: { id: string; identifier: string; url: string; title: string }
          }
        }
      }
      if (data.data?.issueCreate?.success && data.data.issueCreate.issue) {
        created.push(data.data.issueCreate.issue)
      } else {
        errors.push(issue.title)
      }
    } catch (e) {
      errors.push(`${issue.title}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }
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

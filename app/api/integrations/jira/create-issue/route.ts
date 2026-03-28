import { NextRequest, NextResponse } from 'next/server'

interface JiraIssueInput {
  summary: string
  description: string
  assigneeEmail?: string
  dueDate?: string
  priority?: string
  issueType?: string
}

interface JiraCreatedIssue {
  key: string
  url: string
  summary: string
}

interface RequestBody {
  domain: string
  email: string
  apiToken: string
  projectKey: string
  issues: JiraIssueInput[]
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { domain, email, apiToken, projectKey, issues } = body

  if (!domain || !email || !apiToken || !projectKey || !Array.isArray(issues) || issues.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
  const baseUrl = `https://${domain}/rest/api/3/issue`

  const created: JiraCreatedIssue[] = []
  const errors: string[] = []

  for (const issue of issues) {
    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      summary: issue.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: issue.description || issue.summary,
              },
            ],
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
        const errText = await res.text()
        errors.push(`${issue.summary}: ${res.status} ${errText}`)
        continue
      }

      const data = await res.json() as { id: string; key: string; self: string }

      created.push({
        key: data.key,
        url: `https://${domain}/browse/${data.key}`,
        summary: issue.summary,
      })
    } catch (err) {
      errors.push(`${issue.summary}: ${err instanceof Error ? err.message : 'Network error'}`)
    }
  }

  if (created.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 502 })
  }

  return NextResponse.json({ created, errors: errors.length > 0 ? errors : undefined })
}

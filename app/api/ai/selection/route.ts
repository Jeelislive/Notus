import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

async function groqChat(systemPrompt: string, userMessage: string, temperature = 0.3) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

// Strip any chain-of-thought reasoning the model leaks into the output
function stripReasoning(text: string): string {
  // Remove "Step N: ..." blocks (the whole paragraph)
  const noSteps = text.replace(/^Step\s+\d+[:\)][^\n]*\n?/gim, '').trim()
  // If the result still starts with a reasoning header, return the last paragraph
  if (/^(step|thinking|reasoning|approach|analysis)/i.test(noSteps)) {
    const parts = noSteps.split(/\n{2,}/)
    return parts[parts.length - 1].trim()
  }
  return noSteps
}

function isFormattingRequest(prompt: string) {
  const p = prompt.toLowerCase()
  return /\b(red|blue|green|orange|purple|yellow|pink|gray|grey|black|white|color|colour|font.?size|bigger|larger|smaller|increase.?font|decrease.?font|bold|italic|size \d+)\b/.test(p)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { selectedText, prompt } = await request.json() as { selectedText: string; prompt: string }
  if (!selectedText?.trim() || !prompt?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Handle highlight command — return JSON list of words to highlight (no content replacement)
  if (prompt === '__highlight__') {
    const highlightSystem = `You are a meeting notes analyst. Your job is to find the most critical words and short phrases in the text.

OUTPUT: A valid JSON array only. No explanation. No markdown. No code fences. Just the raw JSON array.

FORMAT: [{"word":"exact text","color":"red"}, {"word":"exact text","color":"blue"}]

COLOR RULES:
- "red" = urgent, action required, blocker, risk, deadline, must-do, problem, issue, failed, critical, overdue, missing, blocked
- "blue" = person name, decision made, key metric, product name, company name, important concept, agreed outcome, goal, milestone

SELECTION RULES:
- Pick 4 to 7 items total — mix red and blue
- Each "word" field must be an EXACT substring from the input — same case, same spelling, copy verbatim
- Prefer specific nouns, verbs, names, numbers, and named concepts over generic filler words
- Short phrases (2-5 words) are much better than single generic words like "meeting" or "team"
- Never pick stop words: the, a, an, is, was, are, were, and, or, but, in, on, at, to, for, of, with, this, that`

    const highlightUser = `Find the most important words and phrases in this text. Return only JSON:\n\n${selectedText}`

    let raw = ''

    // Try Claude Haiku first for better quality
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: highlightSystem,
          messages: [{ role: 'user', content: highlightUser }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        raw = data.content?.[0]?.text ?? ''
      }
    } catch { /* fall through to Groq */ }

    if (!raw) {
      raw = await groqChat(highlightSystem, highlightUser, 0.1)
    }

    try {
      const cleaned = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
      const parsed = JSON.parse(cleaned)
      const highlights = Array.isArray(parsed) ? parsed : parsed.highlights ?? []
      return NextResponse.json({ highlights })
    } catch {
      return NextResponse.json({ highlights: [] })
    }
  }

  const isFormatting = isFormattingRequest(prompt)

  const systemPrompt = isFormatting
    ? `You are a rich text formatter. Your ONLY job is to wrap selected text in HTML tags.

CRITICAL RULES:
- Output ONLY the final HTML. Nothing else. No steps, no reasoning, no explanation.
- NEVER change, rephrase, or alter the words. Only wrap in HTML.
- Do not say "Step 1" or "Here is" or anything before the HTML.

HOW TO FORMAT:
- Color red      → <span style="color: #ef4444">[text]</span>
- Color blue     → <span style="color: #3b82f6">[text]</span>
- Color green    → <span style="color: #22c55e">[text]</span>
- Color orange   → <span style="color: #f97316">[text]</span>
- Color purple   → <span style="color: #a855f7">[text]</span>
- Color yellow   → <span style="color: #eab308">[text]</span>
- Color pink     → <span style="color: #ec4899">[text]</span>
- Color gray     → <span style="color: #71717a">[text]</span>
- Bigger/larger  → <span style="font-size: 20px">[text]</span>
- Smaller        → <span style="font-size: 12px">[text]</span>
- Font size N    → <span style="font-size: Npx">[text]</span>
- Bold           → <strong>[text]</strong>
- Italic         → <em>[text]</em>`
    : `You are an inline AI assistant in a rich-text meeting notes editor. Output ONLY the result - no steps, no reasoning, no preamble.

CRITICAL RULES:
- Output ONLY the final result. Start immediately with the content.
- Never write "Step 1:", "Step 2:", "Here is", "Sure!", or any introduction.
- NEVER use markdown. NEVER use ##, **, *, -. The editor only renders HTML.
- Output valid HTML for any rewrite/structuring task.

HTML RULES:
- Paragraphs  → <p>text</p>
- Headings    → <h2>text</h2> or <h3>text</h3>
- Bullets     → <ul><li>item</li></ul>
- Numbered    → <ol><li>item</li></ol>
- Bold        → <strong>text</strong>
- Italic      → <em>text</em>

For questions about the text: reply in 1-2 plain sentences only.`

  const userMessage = isFormatting
    ? `Selected text: <selected>${selectedText}</selected>\n\nRequest: ${prompt}`
    : `Selected text:\n"${selectedText}"\n\nRequest: ${prompt}`

  try {
    const raw = await groqChat(systemPrompt, userMessage)
    const result = stripReasoning(
      raw.trim()
        .replace(/^```html?\n?/, '').replace(/\n?```$/, '')
        .replace(/^["']|["']$/g, '')
    )
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[selection-ai] Error:', err)
    return NextResponse.json({ error: 'AI failed' }, { status: 500 })
  }
}

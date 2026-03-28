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
    : `You are an inline AI assistant in a rich-text meeting notes editor. Output ONLY the result — no steps, no reasoning, no preamble.

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

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob | null

  if (!audio || audio.size === 0) {
    return NextResponse.json({ text: '', segments: [] })
  }

  // Wrap in File with explicit name+type — Groq requires a filename with a recognized extension
  const file = new File([audio], 'chunk.webm', { type: audio.type || 'audio/webm' })

  const groqForm = new FormData()
  groqForm.append('file', file)
  groqForm.append('model', 'whisper-large-v3-turbo')
  groqForm.append('response_format', 'verbose_json')
  groqForm.append('language', 'en')
  groqForm.append('temperature', '0')
  // Request word-level timestamps for fine-grained speaker change detection
  groqForm.append('timestamp_granularities[]', 'word')
  groqForm.append('timestamp_granularities[]', 'segment')

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq API error:', res.status, err)
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: res.status >= 400 && res.status < 500 ? 400 : 500 }
      )
    }

    const result = await res.json()
    return NextResponse.json({
      text: result.text ?? '',
      segments: Array.isArray(result.segments) ? result.segments : [],
      words: Array.isArray(result.words) ? result.words : [],
    })
  } catch (err) {
    console.error('Groq fetch error:', err)
    return NextResponse.json({ error: 'Transcription request failed' }, { status: 500 })
  }
}

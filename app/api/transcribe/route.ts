import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { transcriptSegments, meetings, profiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { log } from '@/lib/logger'

const logger = log('transcribe')

async function getUserTranscriptionLanguage(userId: string): Promise<string> {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { transcriptionLanguage: true }
    })
    return profile?.transcriptionLanguage || 'auto'
  } catch (error) {
    console.error('Failed to get user transcription language:', error)
    return 'auto'
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob | null

  if (!audio || audio.size === 0) {
    return NextResponse.json({ text: '', segments: [] })
  }

  // Get user's transcription language preference
  const userTranscriptionLanguage = await getUserTranscriptionLanguage(session.user.id)

  logger.info('Transcribing chunk', { 
    userId: session.user.id, 
    sizeBytes: audio.size, 
    preferredLanguage: userTranscriptionLanguage 
  })

  // Wrap in File with explicit name+type - Groq requires a filename with a recognized extension
  const file = new File([audio], 'chunk.webm', { type: audio.type || 'audio/webm' })

  const groqForm = new FormData()
  groqForm.append('file', file)
  groqForm.append('model', 'whisper-large-v3-turbo')
  groqForm.append('response_format', 'verbose_json')
  
  // Use user's preferred language if not auto-detect
  if (userTranscriptionLanguage !== 'auto') {
    groqForm.append('language', userTranscriptionLanguage)
  }
  
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
      logger.error('Groq API error', { status: res.status, body: err, userId: session.user.id })
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: res.status >= 400 && res.status < 500 ? 400 : 500 }
      )
    }

    const result = await res.json()
    
    // Extract detected language from Whisper response if available
    const detectedLanguage = result.language || 'auto-detected'
    
    logger.info('Transcription OK', {
      userId: session.user.id,
      textLength: (result.text ?? '').length,
      segments: Array.isArray(result.segments) ? result.segments.length : 0,
      words: Array.isArray(result.words) ? result.words.length : 0,
      detectedLanguage,
    })
    
    return NextResponse.json({
      text: result.text ?? '',
      segments: Array.isArray(result.segments) ? result.segments : [],
      words: Array.isArray(result.words) ? result.words : [],
      detectedLanguage, // Include detected language in response
    })
  } catch (err) {
    logger.error('Groq fetch threw', { error: err instanceof Error ? err.message : String(err), userId: session.user.id })
    return NextResponse.json({ error: 'Transcription request failed' }, { status: 500 })
  }
}

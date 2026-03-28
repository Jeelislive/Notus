#!/usr/bin/env node
/**
 * End-to-end Groq Whisper test
 * Downloads a real speech sample, sends it to Groq exactly as our API route does,
 * and prints the full raw response.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// A short LibriVox public-domain speech sample (~8 seconds, MP3)
const SAMPLE_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

// We'll use a well-known short speech file from OpenAI's own Whisper test fixtures
const WHISPER_SAMPLE_URL = 'https://github.com/openai/whisper/raw/main/tests/jfk.flac'

const SAMPLE_PATH = '/tmp/test-speech.flac'

async function downloadSample() {
  if (existsSync(SAMPLE_PATH)) {
    console.log('✓ Using cached sample:', SAMPLE_PATH)
    return
  }
  console.log('Downloading JFK speech sample (Whisper official test file)...')
  const res = await fetch(WHISPER_SAMPLE_URL)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  writeFileSync(SAMPLE_PATH, Buffer.from(buf))
  console.log(`✓ Downloaded ${buf.byteLength} bytes to ${SAMPLE_PATH}`)
}

async function testGroq() {
  await downloadSample()

  const audioBytes = readFileSync(SAMPLE_PATH)
  const audioBlob = new Blob([audioBytes], { type: 'audio/flac' })
  const file = new File([audioBlob], 'test.flac', { type: 'audio/flac' })

  console.log('\n--- Sending to Groq Whisper ---')
  console.log('File size:', audioBytes.byteLength, 'bytes')
  console.log('Model: whisper-large-v3-turbo')
  console.log('Response format: verbose_json')

  const groqForm = new FormData()
  groqForm.append('file', file)
  groqForm.append('model', 'whisper-large-v3-turbo')
  groqForm.append('response_format', 'verbose_json')
  groqForm.append('language', 'en')
  groqForm.append('temperature', '0')

  const start = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: groqForm,
  })
  const latencyMs = Date.now() - start

  console.log('\n--- Response ---')
  console.log('Status:', res.status, res.statusText)
  console.log('Latency:', latencyMs, 'ms')

  const text = await res.text()

  if (!res.ok) {
    console.error('ERROR from Groq:')
    console.error(text)
    return
  }

  let result
  try {
    result = JSON.parse(text)
  } catch {
    console.error('Failed to parse JSON:', text)
    return
  }

  console.log('\n✓ Full response:')
  console.log(JSON.stringify(result, null, 2))

  console.log('\n--- Summary ---')
  console.log('text:', result.text)
  console.log('segments count:', result.segments?.length ?? 0)
  if (result.segments?.length) {
    console.log('first segment:', result.segments[0])
    console.log('last segment:', result.segments[result.segments.length - 1])
  }
}

testGroq().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

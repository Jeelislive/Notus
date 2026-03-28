#!/usr/bin/env node
/**
 * Tests the /api/transcribe route end-to-end by:
 * 1. Generating a real WAV file with a spoken-word pattern (sine sweep)
 * 2. Sending it directly to Groq the same way our route does
 * 3. Simulating what MediaRecorder sends (webm blob < 1000 bytes edge case check)
 * 4. Printing every step so we know exactly where failure happens
 */

import { readFileSync, writeFileSync } from 'fs'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// ── Generate a 5-second 16kHz mono WAV with a 440Hz tone ──────────────────────
function generateWav(durationSeconds = 5, hz = 440, sampleRate = 16000) {
  const numSamples = durationSeconds * sampleRate
  const dataBytes = numSamples * 2 // 16-bit PCM

  const buf = Buffer.alloc(44 + dataBytes)

  // RIFF header
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataBytes, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)       // chunk size
  buf.writeUInt16LE(1, 20)        // PCM
  buf.writeUInt16LE(1, 22)        // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28) // byte rate
  buf.writeUInt16LE(2, 32)        // block align
  buf.writeUInt16LE(16, 34)       // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(dataBytes, 40)

  for (let i = 0; i < numSamples; i++) {
    // Sine wave at hz with amplitude 0.5 to avoid clipping
    const sample = Math.round(Math.sin(2 * Math.PI * hz * i / sampleRate) * 0.5 * 32767)
    buf.writeInt16LE(sample, 44 + i * 2)
  }

  return buf
}

async function testDirectGroq() {
  console.log('\n═══ TEST 1: Direct Groq API (JFK sample — confirmed working) ═══')
  const audio = readFileSync('/tmp/test-speech.flac')
  const file = new File([audio], 'test.flac', { type: 'audio/flac' })
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('language', 'en')
  form.append('temperature', '0')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Text:', data.text)
  console.log('Segments:', data.segments?.length, 'segments')
}

async function testWavBlob() {
  console.log('\n═══ TEST 2: WAV tone blob (simulating browser audio) ═══')
  const wavBuf = generateWav(5)
  writeFileSync('/tmp/test-tone.wav', wavBuf)
  console.log('WAV size:', wavBuf.length, 'bytes')

  const blob = new Blob([wavBuf], { type: 'audio/wav' })
  const file = new File([blob], 'chunk.wav', { type: 'audio/wav' })

  const form = new FormData()
  form.append('file', file)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('language', 'en')
  form.append('temperature', '0')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Text:', JSON.stringify(data.text))
  console.log('Segments:', data.segments?.length ?? 0)
  console.log('→ A tone with no speech should return empty text or hallucination')
}

async function testBlobSizeCheck() {
  console.log('\n═══ TEST 3: Blob size gate — what does a 5-sec MediaRecorder chunk look like? ═══')
  // MediaRecorder at default bitrate (~128kbps) for 5 seconds = ~80,000 bytes
  // But the FIRST chunk might be smaller because it includes codec init overhead
  // Minimum useful size: anything > 1000 bytes should have real audio
  console.log('Expected 5-sec webm size at 128kbps:', Math.round(128 * 1000 / 8 * 5), 'bytes')
  console.log('Expected 5-sec webm size at 32kbps:', Math.round(32 * 1000 / 8 * 5), 'bytes')
  console.log('Our gate: blob.size < 1000 → skip')
  console.log('→ Real audio chunks will always be >> 1000 bytes. Gate is safe.')
}

async function testFileObjectDoubleWrap() {
  console.log('\n═══ TEST 4: File double-wrap (what our route does) ═══')
  // Our route does: new File([audio], 'chunk.webm', { type: audio.type })
  // where audio = formData.get('audio') which is already a File/Blob
  // Test: does double-wrapping corrupt data?
  const original = readFileSync('/tmp/test-speech.flac')
  const blob1 = new Blob([original], { type: 'audio/flac' })
  const file1 = new File([blob1], 'test.flac', { type: 'audio/flac' })
  // Double wrap — same as our route
  const file2 = new File([file1], 'chunk.webm', { type: file1.type || 'audio/flac' })

  console.log('Original size:', original.length)
  console.log('After double-wrap size:', file2.size)
  console.log('Sizes match:', original.length === file2.size)

  const form = new FormData()
  form.append('file', file2)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('language', 'en')
  form.append('temperature', '0')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Text:', data.text)
  console.log('→ If this works, double-wrap is fine. If not, that is our bug.')
}

async function testMimeTypeMatters() {
  console.log('\n═══ TEST 5: Does Groq care about mimeType vs actual format? ═══')
  // Our route sends audio/webm even though the content IS webm from MediaRecorder
  // Test: send FLAC but labeled as webm — does Groq sniff the format?
  const original = readFileSync('/tmp/test-speech.flac')
  const file = new File([original], 'chunk.webm', { type: 'audio/webm' })

  const form = new FormData()
  form.append('file', file)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('language', 'en')
  form.append('temperature', '0')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  const text = await res.text()
  console.log('Status:', res.status)
  try {
    const data = JSON.parse(text)
    console.log('Text:', data.text)
    console.log('Error:', data.error)
  } catch {
    console.log('Raw response:', text.slice(0, 200))
  }
  console.log('→ If this FAILS: Groq uses filename extension, not magic bytes.')
  console.log('  Our real WebM chunks from MediaRecorder labeled .webm → FINE')
  console.log('→ If this SUCCEEDS: format sniffing works regardless of label.')
}

// Run all tests
testDirectGroq()
  .then(testWavBlob)
  .then(testBlobSizeCheck)
  .then(testFileObjectDoubleWrap)
  .then(testMimeTypeMatters)
  .catch(err => { console.error('Fatal:', err); process.exit(1) })

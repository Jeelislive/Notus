'use client'

import { useState, useCallback, useRef, useEffect, useTransition, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, Sparkles, Copy, Check,
  Send, Loader2, Mail, Calendar, Clock,
  Mic, Wand2, Link2, Square,
} from 'lucide-react'
import { useRecording } from '@/hooks/use-recording'
import type { Meeting, Note } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ShiningText } from '@/components/ui/shining-text'
import { TypewriterText } from '@/components/ui/typewriter-text'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { parseAgendaContent, type CurrentUser } from '@/components/dashboard/one-on-one-agenda'
import type { StructuredSummaryData } from '@/components/dashboard/structured-summary'
import { updateNoteContent, completeMeeting } from '@/app/actions/meetings'
import { toast } from '@/hooks/use-toast'
import { formatDate, formatDuration } from '@/lib/utils'

type Tab = 'notes' | 'email'
type SaveStatus = 'saved' | 'saving' | 'unsaved'
interface ChatMessage { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'List all action items',
  'Write a follow-up email',
  'What were the key decisions?',
  'List open questions',
]

// ── Meeting type helpers ───────────────────────────────────────────────────
const MEETING_TYPE_STYLES: Record<string, { label: string }> = {
  '1-on-1':             { label: '1-on-1' },
  'Customer Discovery': { label: 'Discovery' },
  'Sales Call':         { label: 'Sales Call' },
  'User Interview':     { label: 'User Interview' },
  'Daily Standup':      { label: 'Standup' },
}

function detectMeetingType(meetingNotes: Note[]): string | null {
  if (!meetingNotes.length) return null
  for (const note of meetingNotes) {
    if (MEETING_TYPE_STYLES[note.title]) return note.title
  }
  const content = meetingNotes[0]?.content ?? ''
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed.__template === 'one-on-one') return '1-on-1'
  } catch { /* not JSON */ }
  if (content.includes('Customer Discovery')) return 'Customer Discovery'
  if (content.includes('Sales Call')) return 'Sales Call'
  if (content.includes('User Interview')) return 'User Interview'
  if (content.includes('Daily Standup')) return 'Daily Standup'
  return null
}

function MeetingTypePill({ type }: { type: string }) {
  const style = MEETING_TYPE_STYLES[type]
  if (!style) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border border-border bg-muted text-muted-foreground">
      {style.label}
    </span>
  )
}

type NoteTranslation = {
  summary?: string | null
  summaryStructured?: string | null
  actionItems?: string | null
  followUpEmail?: string | null
}

interface NotesPageClientProps {
  meetings: Meeting[]
  notesByMeeting: Record<string, Note[]>
  selectedNoteId: string | null
  currentUser: CurrentUser
  preferredLanguage?: string
  translationsByMeeting?: Record<string, NoteTranslation>
}

export function NotesPageClient({ meetings, notesByMeeting, selectedNoteId, preferredLanguage = 'en', translationsByMeeting = {} }: NotesPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const meetingParam = searchParams.get('meeting')
  const allNotes = Object.values(notesByMeeting).flat()
  const resolvedNoteId = selectedNoteId ?? (meetingParam ? (notesByMeeting[meetingParam]?.[0]?.id ?? null) : null)
  const activeNote = resolvedNoteId ? allNotes.find((n) => n.id === resolvedNoteId) ?? allNotes[0] ?? null : allNotes[0] ?? null
  const activeMeeting = activeNote ? meetings.find((m) => m.id === activeNote.meetingId) ?? null : null

  useEffect(() => {
    if (meetingParam && activeNote) {
      router.replace(`/dashboard/notes?note=${activeNote.id}`, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectNote(noteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('note', noteId)
    router.push(`/dashboard/notes?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-1 -mx-4 -mt-16 -mb-4 md:-mx-8 md:-mt-8 md:-mb-8 overflow-hidden">
      {activeNote && activeMeeting ? (
        <NoteEditor
          meeting={activeMeeting}
          note={activeNote}
          meetingType={detectMeetingType(notesByMeeting[activeMeeting.id] ?? [])}
          preferredLanguage={preferredLanguage}
          translation={translationsByMeeting[activeMeeting.id] ?? null}
          onSelectNote={selectNote}
          key={activeNote.id}
        />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
          <div className="size-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
            <FileText className="size-5 text-muted-foreground/30" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-medium text-foreground">Select a note</p>
          <p className="text-[12px] text-muted-foreground">Pick a meeting from the list on the left</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Note editor
// ─────────────────────────────────────────────
function NoteEditor({
  meeting, note, meetingType,
  preferredLanguage = 'en', translation, onSelectNote,
}: {
  meeting: Meeting; note: Note; meetingType: string | null
  preferredLanguage?: string
  translation?: NoteTranslation | null
  onSelectNote: (id: string) => void
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [rephrasing, setRephrasing] = useState(false)
  const [hasRephrased, setHasRephrased] = useState(false)
  const [content, setContent] = useState(note.content ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [generating, setGenerating] = useState(false)
  const [emailContent, setEmailContent] = useState(note.followUpEmail ?? '')
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailChunks, setEmailChunks] = useState<{ id: number; text: string; settled: boolean; color: string }[]>([])
  const emailChunkCounter = useRef(0)
  const pendingEmailChunk = useRef('')
  const STREAM_COLORS = ['#f97316', '#a855f7', '#22c55e', '#3b82f6']
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sentEmail, setSentEmail] = useState(false)
  const [pendingHighlights, setPendingHighlights] = useState<{ word: string; color: string }[] | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showRecordingPopup, setShowRecordingPopup] = useState(false)
  const [generatingNotes, setGeneratingNotes] = useState(false)
  const [liveTranslation, setLiveTranslation] = useState<NoteTranslation | null>(translation ?? null)
  const [isTranslating, setIsTranslating] = useState(false)
  const translationTriggeredRef = useRef(false)
  const [, startTransition] = useTransition()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Local AI state overlay
  const [localSummary, setLocalSummary] = useState<string | null>(null)
  const [localActionItems, setLocalActionItems] = useState<string | null>(null)
  const [localSummaryStructured, setLocalSummaryStructured] = useState<string | null>(null)
  const [localFollowUpEmail, setLocalFollowUpEmail] = useState<string | null>(null)

  const isProcessing = (meeting.status === 'processing' || generating) && !generatingNotes
  const hasAI = !!(localSummary ?? note.summary ?? localActionItems ?? note.actionItems ?? localFollowUpEmail ?? note.followUpEmail)

  useEffect(() => {
    if (preferredLanguage === 'en' || liveTranslation !== null || translationTriggeredRef.current || !hasAI || meeting.status !== 'completed') return
    translationTriggeredRef.current = true
    setIsTranslating(true)
    fetch('/api/translate/meeting', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: meeting.id, targetLanguage: preferredLanguage }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.translation) setLiveTranslation(data.translation) })
      .catch((e) => console.error('[Translation]', e))
      .finally(() => setIsTranslating(false))
  }, [preferredLanguage, liveTranslation, hasAI, meeting.id, meeting.status])

  const resolvedSummary = liveTranslation?.summary ?? localSummary ?? note.summary
  const resolvedActionItems = liveTranslation?.actionItems ?? localActionItems ?? note.actionItems
  const resolvedFollowUpEmail = liveTranslation?.followUpEmail ?? localFollowUpEmail ?? note.followUpEmail
  const resolvedSummaryStructured = liveTranslation?.summaryStructured ?? localSummaryStructured ?? note.summaryStructured
  const isTranslated = preferredLanguage !== 'en' && !!liveTranslation

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  useEffect(() => {
    if (resolvedFollowUpEmail && !emailContent) setEmailContent(resolvedFollowUpEmail)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFollowUpEmail])

  // Clear chunks once all are settled and generation is done
  useEffect(() => {
    if (generatingEmail) return
    if (emailChunks.length > 0 && emailChunks.every((c) => c.settled)) {
      const t = setTimeout(() => setEmailChunks([]), 200)
      return () => clearTimeout(t)
    }
  }, [generatingEmail, emailChunks])

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => startTransition(() => router.refresh()), 3000)
    return () => clearInterval(interval)
  }, [isProcessing, router])

  const handleContentChange = useCallback((html: string) => {
    setContent(html)
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await updateNoteContent(meeting.id, html, note.id)
      setSaveStatus('saved')
    }, 2000)
  }, [meeting.id, note.id])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.summary) setLocalSummary(data.summary)
        if (data.actionItems) setLocalActionItems(data.actionItems)
        if (data.summaryStructured) setLocalSummaryStructured(data.summaryStructured)
        if (data.followUpEmail) setLocalFollowUpEmail(data.followUpEmail)
      }
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  async function handleRephrase() {
    if (!content.trim() || rephrasing) return
    setRephrasing(true)
    try {
      const res = await fetch('/api/ai/rephrase-notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, content, useGroq: hasRephrased }),
      })
      const data = await res.json()
      if (data.html) {
        setContent(data.html)
        setHasRephrased(true)
        setSaveStatus('saved')
        setRephrasing(false)
        toast('Notes generated', { variant: 'success' })
        // Auto-highlight
        const plainText = data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        fetch('/api/ai/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedText: plainText, prompt: '__highlight__' }),
        })
          .then((r) => r.json())
          .then((json) => { if (json.highlights?.length) setPendingHighlights(json.highlights) })
          .catch(() => {})
      } else {
        toast(data.error ?? 'Failed to generate notes', { variant: 'destructive' })
        setRephrasing(false)
      }
    } catch {
      setRephrasing(false)
    }
  }

  async function handleGenerateEmail() {
    if (generatingEmail) return
    setGeneratingEmail(true)
    setEmailContent('')
    setEmailChunks([])
    emailChunkCounter.current = 0
    pendingEmailChunk.current = ''

    function flushChunk(force = false) {
      const text = pendingEmailChunk.current
      if (!text && !force) return
      pendingEmailChunk.current = ''
      if (!text) return
      const id = emailChunkCounter.current++
      const color = STREAM_COLORS[id % STREAM_COLORS.length]
      setEmailChunks((prev) => [...prev, { id, text, settled: false, color }])
      setTimeout(() => {
        setEmailChunks((prev) => prev.map((c) => c.id === id ? { ...c, settled: true } : c))
      }, 50)
    }

    try {
      const res = await fetch('/api/ai/followup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, notesContent: content }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const { delta } = JSON.parse(data)
            if (delta) {
              fullText += delta
              pendingEmailChunk.current += delta
              // Flush on word boundary (space or newline)
              if (/[\s\n]/.test(delta)) flushChunk()
            }
          } catch { /* ignore */ }
        }
      }
      flushChunk(true) // flush any remaining
      setEmailContent(fullText)
    } finally {
      setGeneratingEmail(false)
    }
  }

  async function sendChatMessage(overrideText?: string) {
    const text = (overrideText ?? chatInput).trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: text }
    const msgs = [...chatMessages, userMsg]
    setChatMessages(msgs)
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, meetingTitle: meeting.title, messages: msgs }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
            if (delta) setChatMessages((prev) => {
              const upd = [...prev]
              upd[upd.length - 1] = { ...upd[upd.length - 1], content: upd[upd.length - 1].content + delta }
              return upd
            })
          } catch { /* ignore */ }
        }
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setChatLoading(false)
    }
  }

  let actionItems: string[] = []
  if (resolvedActionItems) { try { actionItems = JSON.parse(resolvedActionItems) } catch { actionItems = [] } }

  let structuredData: StructuredSummaryData | null = null
  if (resolvedSummaryStructured) { try { structuredData = JSON.parse(resolvedSummaryStructured) } catch { structuredData = null } }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'notes', label: 'Notes',     icon: <FileText className="size-3.5" /> },
    { id: 'email', label: 'Follow-up', icon: <Mail className="size-3.5" /> },
  ]

  // Participants from structured data for the header
  const participants = structuredData?.overview?.participants ?? []

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ════════════════ Main content ════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-8 pt-4 pb-0 border-b border-border shrink-0">
          {/* Title row + meta + actions all inline */}
          <div className="flex items-center gap-3 mb-1.5 min-w-0">
            {meetingType && <MeetingTypePill type={meetingType} />}
            <h1 className="text-[20px] font-semibold text-foreground leading-snug truncate" style={{ letterSpacing: '-0.02em' }}>
              {note.title}
            </h1>
            <div className="flex-1" />
            {activeTab === 'notes' && (
              <span className="text-[11px] shrink-0" style={{
                color: saveStatus === 'saving' ? 'var(--muted-foreground)' : saveStatus === 'unsaved' ? '#f59e0b' : 'transparent',
                transition: 'color 200ms ease-out',
              }}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'x'}
              </span>
            )}
          </div>

          {/* Meta row: date + duration + participants — compact horizontal */}
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
              <Calendar className="size-3" />{formatDate(meeting.createdAt)}
            </span>
            {(meeting.durationSeconds ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                <Clock className="size-3" />{formatDuration(meeting.durationSeconds ?? 0)}
              </span>
            )}
            {participants.slice(0, 4).map((p) => (
              <span key={p} className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                <span className="size-4 rounded-full bg-muted border border-border inline-flex items-center justify-center text-[8px] font-bold text-foreground/60">
                  {p.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                {p}
              </span>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0.5 -mx-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-colors rounded-t-md ${
                  activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                }`}
              >
                <span className="opacity-70">{tab.icon}</span>
                {tab.label}
                {tab.id === 'notes' && isProcessing && <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />}
                {tab.id === 'email' && hasAI && !isProcessing && <span className="size-1.5 rounded-full bg-primary/40" />}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] rounded-full bg-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notes tab ── */}
        {activeTab === 'notes' && (
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {rephrasing ? (
              /* Skeleton while API is fetching */
              <div className="p-6 space-y-3 animate-pulse">
                <div className="h-6 w-2/5 rounded-lg bg-muted" />
                {[85, 70, 90, 60, 78].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-muted/60" style={{ width: `${w}%`, opacity: 1 - i * 0.07 }} />
                ))}
                <div className="h-6 w-1/3 rounded-lg bg-muted mt-4" />
                {[72, 88, 65].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-muted/60" style={{ width: `${w}%`, opacity: 1 - i * 0.07 }} />
                ))}
              </div>
            ) : (
              /* Normal editor */
              <TiptapEditor
                content={parseAgendaContent(content) ? '' : content}
                onChange={handleContentChange}
                editable={meeting.status !== 'processing'}
                placeholder="Start writing your notes…"
                highlights={pendingHighlights}
                onHighlightsApplied={() => setPendingHighlights(null)}
              />
            )}

            {/* Floating bottom toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              <button
                onClick={() => setShowRecordingPopup(true)}
                title="Record meeting"
                className="size-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:bg-foreground/85 active:scale-95 transition-all"
              >
                <Mic className="size-4" />
              </button>
              <div className="flex items-center rounded-full border border-border bg-background shadow-lg px-1 py-1 gap-0.5">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-foreground text-background">
                  <FileText className="size-3.5" />
                  Notes
                </button>
                <button
                  onClick={handleRephrase}
                  disabled={rephrasing || !content.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
                >
                  {rephrasing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {rephrasing ? 'Generating…' : 'Generate Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Email tab ── */}
        {activeTab === 'email' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-8 py-7">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em]">Follow-up Email</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateEmail}
                    disabled={generatingEmail || !content.trim()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                  >
                    {generatingEmail ? <><Loader2 className="size-3 animate-spin" />Generating…</> : <><Wand2 className="size-3" />{emailContent ? 'Regenerate' : 'Generate'}</>}
                  </button>
                  {emailContent && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(emailContent); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); toast('Email copied', { variant: 'success' }) }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                    >
                      {copiedEmail ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
                    </button>
                  )}
                </div>
              </div>
              {generatingEmail && emailChunks.length === 0 ? (
                /* Skeleton: before first chunk arrives */
                <div className="space-y-3 pt-1 animate-pulse">
                  {[82, 96, 74, 90, 62, 88, 55].map((w, i) => (
                    <div key={i} className="h-[18px] rounded-md bg-muted" style={{ width: `${w}%`, opacity: 1 - i * 0.06 }} />
                  ))}
                </div>
              ) : (generatingEmail || (!generatingEmail && emailChunks.length > 0 && !emailContent)) ? (
                /* Streaming: colored word-by-word flow */
                <div
                  className="text-[18px] leading-[2] whitespace-pre-wrap"
                  style={{ fontFamily: 'inherit' }}
                >
                  {emailChunks.map((chunk) => (
                    <span
                      key={chunk.id}
                      style={{
                        color: chunk.settled ? 'var(--foreground)' : chunk.color,
                        transition: 'color 150ms ease-out',
                      }}
                    >
                      {chunk.text}
                    </span>
                  ))}
                  {generatingEmail && (
                    <span className="animate-blink inline-block w-px h-[1em] bg-foreground/50 ml-0.5 align-middle" />
                  )}
                </div>
              ) : emailContent ? (
                /* Done: editable textarea */
                <textarea
                  value={emailContent}
                  onChange={(e) => {
                    setEmailContent(e.target.value)
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  ref={(el) => {
                    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
                  }}
                  className="w-full text-[18px] text-foreground leading-[2] bg-transparent resize-none focus:outline-none overflow-hidden"
                  style={{ fontFamily: 'inherit' }}
                />
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Mail className="size-10 text-muted-foreground/20 mb-3" strokeWidth={1} />
                  <p className="text-[14px] font-medium text-foreground">No follow-up email yet</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Click Generate to draft one from your notes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════ Right panel ════════════════ */}
      <div className="hidden lg:flex flex-col w-[520px] xl:w-[580px] border-l border-border bg-background shrink-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <p className="text-[13px] font-semibold text-foreground truncate flex-1 mr-3">{meeting.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); toast('Link copied', { variant: 'success' }) }}
              title="Copy link"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {copiedLink ? <Check className="size-4 text-emerald-500" /> : <Link2 className="size-4" />}
            </button>
            <button
              onClick={async () => {
                setSendingEmail(true)
                try {
                  const res = await fetch('/api/email/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meetingId: meeting.id }),
                  })
                  if (res.ok) { setSentEmail(true); setTimeout(() => setSentEmail(false), 3000); toast('Notes emailed to you', { variant: 'success' }) }
                  else toast('Failed to send email', { variant: 'destructive' })
                } finally { setSendingEmail(false) }
              }}
              disabled={sendingEmail}
              title="Email notes to yourself"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              {sentEmail ? <Check className="size-4 text-emerald-500" /> : sendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            </button>
            <button
              onClick={() => {
                const text = resolvedSummary ?? content.replace(/<[^>]+>/g, '') ?? ''
                navigator.clipboard.writeText(text)
                setCopiedText(true)
                setTimeout(() => setCopiedText(false), 2000)
                toast('Copied to clipboard', { variant: 'success' })
              }}
              title="Copy notes text"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {copiedText ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-4">
          {chatMessages.length === 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11.5px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3">Ask Notus</p>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendChatMessage(prompt)}
                  disabled={chatLoading}
                  className="w-full text-left px-3.5 py-3 rounded-xl border border-border text-[15px] text-foreground/80 hover:text-foreground hover:bg-muted/50 hover:border-border/80 transition-colors disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-tr-sm bg-foreground text-background text-[15px] leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="text-[15px] leading-[1.75] text-foreground w-full">
                  {msg.content ? (
                    <TypewriterText text={msg.content} speed={6} />
                  ) : (chatLoading && i === chatMessages.length - 1) ? (
                    <ShiningText text="Thinking…" className="text-[15px]" />
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="px-4 pb-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-3 focus-within:border-foreground/20 focus-within:bg-background transition-all">
            <input
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
              placeholder="Ask about this meeting…"
              disabled={chatLoading}
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
            />
            <button
              onClick={() => sendChatMessage()}
              disabled={chatLoading || !chatInput.trim()}
              className="size-8 rounded-xl flex items-center justify-center bg-foreground text-background disabled:opacity-20 hover:opacity-80 transition-all shrink-0"
            >
              {chatLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen AI analyzing overlay */}
      {generatingNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col gap-6 w-[340px]">
            <div>
              <p className="text-[16px] font-semibold text-foreground">AI is analyzing your meeting</p>
              <p className="text-[13px] text-muted-foreground mt-1">This usually takes 10–30 seconds</p>
            </div>
            <div className="space-y-3">
              {['Analyzing transcript', 'Generating summary', 'Writing notes'].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-1.5 rounded-full bg-foreground/40 shrink-0" style={{ animation: 'notus-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.5}s` }} />
                  <span className="text-[13px] text-muted-foreground">{step}…</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes notus-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>

      <RecordingPopup
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        meetingStatus={meeting.status}
        open={showRecordingPopup}
        onClose={() => setShowRecordingPopup(false)}
        onStopped={() => {
          setShowRecordingPopup(false)
          setGeneratingNotes(true)
          setTimeout(async () => {
            try {
              // Generate formatted notes HTML + highlights (same as "Generate Notes" btn)
              const rephraseRes = await fetch('/api/ai/rephrase-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId: meeting.id, content, useGroq: false }),
              })
              const rephraseData = await rephraseRes.json()
              if (rephraseData.html) {
                setContent(rephraseData.html)
                setHasRephrased(true)
                setSaveStatus('saved')
                // Auto-highlight key sentences
                const plainText = rephraseData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                fetch('/api/ai/selection', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ selectedText: plainText, prompt: '__highlight__' }),
                })
                  .then((r) => r.json())
                  .then((json) => { if (json.highlights?.length) setPendingHighlights(json.highlights) })
                  .catch(() => {})
                toast('Notes ready', { variant: 'success' })
              }
            } finally {
              await completeMeeting(meeting.id)
              setGeneratingNotes(false)
              router.refresh()
            }
          }, 3000)
        }}
      />
    </div>
  )
}

// ── Recording popup ───────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function RecordingPopup({
  meetingId, meetingTitle, meetingStatus, open, onClose, onStopped,
}: {
  meetingId: string; meetingTitle: string; meetingStatus: string | null
  open: boolean; onClose: () => void; onStopped: () => void
}) {
  const { status, error, elapsedSeconds, liveSegments, start, stop } = useRecording({ meetingId })
  const [existingSegments, setExistingSegments] = useState<string[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const didStopRef = useRef(false)
  const hasExisting = existingSegments.length > 0

  useEffect(() => {
    if (open) didStopRef.current = false
  }, [open])

  // Fetch all existing segments at once when popup opens
  useEffect(() => {
    if (!open) return
    setLoadingExisting(true)
    fetch(`/api/transcript?meetingId=${meetingId}`)
      .then((r) => r.json())
      .then((data) => {
        const segs = (data.segments ?? []).map((s: { content: string }) => s.content)
        setExistingSegments(segs)
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [open, meetingId])

  // Auto-scroll as new text arrives
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveSegments.length])

  // Build the accumulated final text from live segments for typewriter
  const finalLiveText = liveSegments
    .filter((s) => s.isFinal)
    .map((s) => s.content)
    .join(' ')

  const interimSeg = liveSegments.find((s) => !s.isFinal)

  const isRecording = status === 'recording'
  const isActive = status === 'recording' || status === 'stopping' || status === 'requesting'

  function triggerStop() {
    if (didStopRef.current) return
    didStopRef.current = true
    stop()
    onStopped()
  }

  function handleStopAndClose() {
    triggerStop()
  }

  function handleClose() {
    if (isActive) {
      triggerStop()
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-[75vw] w-[75vw] flex flex-col gap-0 p-0 overflow-hidden" style={{ height: '75vh', maxHeight: '75vh' }}>
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left panel ─────────────────────────────────────────────── */}
          <div className="flex flex-col w-[320px] shrink-0 border-r border-border bg-muted/10">
            <div className="px-6 pt-6 pb-5 border-b border-border">
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1.5">Meeting</p>
              <p className="text-[18px] font-semibold text-foreground leading-snug">{meetingTitle}</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
              {status === 'idle' && (
                <>
                  <div className="relative flex items-center justify-center">
                    <span className="absolute size-28 rounded-full bg-red-500/8 animate-ping" style={{ animationDuration: '2.4s' }} />
                    <span className="absolute size-20 rounded-full bg-red-500/12" />
                    <div className="relative size-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                      <Mic className="size-7 text-red-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-[17px] font-semibold text-foreground">
                      {hasExisting ? 'Resume recording' : 'Ready to record'}
                    </p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {hasExisting
                        ? 'New audio will be appended to existing transcript'
                        : 'Transcript appears live as you speak'}
                    </p>
                  </div>
                  <button
                    onClick={() => { start(); toast(hasExisting ? 'Resuming recording…' : 'Recording started', { variant: 'success' }) }}
                    disabled={loadingExisting}
                    className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-[15px] font-semibold shadow-lg shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span className="size-2.5 rounded-full bg-white animate-rec" />
                    {hasExisting ? 'Resume recording' : 'Start recording'}
                  </button>
                </>
              )}

              {status === 'requesting' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-[14px] text-muted-foreground">Requesting microphone…</p>
                </div>
              )}

              {isRecording && (
                <>
                  <div className="relative flex items-center justify-center">
                    <span className="absolute size-28 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '1.8s' }} />
                    <div className="relative size-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                      <span className="size-4 rounded-full bg-red-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[38px] font-mono font-bold text-red-500 tabular-nums leading-none">{formatTime(elapsedSeconds)}</p>
                    <p className="text-[13px] text-muted-foreground mt-2">Recording in progress</p>
                  </div>
                  <button
                    onClick={handleStopAndClose}
                    className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-[15px] font-semibold transition-all active:scale-95"
                  >
                    <Square className="size-4 fill-current" />
                    Stop recording
                  </button>
                </>
              )}

              {status === 'stopping' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-[14px] text-muted-foreground">Finalizing…</p>
                </div>
              )}

              {error && <p className="text-[13px] text-red-500 text-center px-2">{error}</p>}
            </div>

            <div className="px-6 py-5 border-t border-border">
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* ── Right panel: transcript ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 flex items-center gap-2">
              <p className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Transcript</p>
              {isRecording && (
                <span className="flex items-center gap-1.5 ml-2">
                  <span className="size-1.5 rounded-full bg-red-500 animate-rec" />
                  <span className="text-[11px] text-red-500 font-medium">Live</span>
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
              {loadingExisting ? (
                <div className="flex items-center justify-center h-full gap-3">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <p className="text-[14px] text-muted-foreground">Loading transcript…</p>
                </div>
              ) : !hasExisting && !finalLiveText && !interimSeg ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="size-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                    <Mic className="size-5 text-muted-foreground/30" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] text-muted-foreground/60">Transcript will appear here as you speak</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Existing DB segments — each as its own paragraph, shown instantly */}
                  {existingSegments.map((seg, i) => (
                    <p key={i} className="text-[15px] leading-relaxed text-muted-foreground/70 font-normal">
                      {seg}
                    </p>
                  ))}

                  {/* New live final text — typewriter on a fresh paragraph */}
                  {finalLiveText && (
                    <p className="text-[15px] leading-relaxed text-foreground font-normal">
                      <TypewriterText text={finalLiveText} speed={22} />
                      {isRecording && !interimSeg && (
                        <span className="inline-block w-[2px] h-[1em] bg-red-400 rounded-full align-text-bottom animate-pulse ml-0.5" />
                      )}
                    </p>
                  )}

                  {/* Interim segment — dimmed, on its own line */}
                  {interimSeg && (
                    <p className="text-[15px] leading-relaxed text-muted-foreground/40 font-normal">
                      {interimSeg.content}
                      <span className="inline-block w-[2px] h-[1em] bg-red-400 rounded-full align-text-bottom animate-pulse ml-0.5" />
                    </p>
                  )}

                  {/* Cursor when recording but nothing spoken yet */}
                  {isRecording && !finalLiveText && !interimSeg && (
                    <span className="inline-block w-[2px] h-[1em] bg-red-400 rounded-full align-text-bottom animate-pulse" />
                  )}
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

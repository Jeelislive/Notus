'use client'

import { useState, useCallback, useRef, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, Sparkles, MessageSquare, Copy, Check,
  Send, Loader2, CheckSquare, Mail, Calendar, Clock,
  Wand2, ChevronRight, Plus, Trash2, ExternalLink, ArrowLeft,
} from 'lucide-react'
import type { Meeting, Note } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { ShiningText } from '@/components/ui/shining-text'
import { TypewriterText } from '@/components/ui/typewriter-text'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { parseAgendaContent, type CurrentUser } from '@/components/dashboard/one-on-one-agenda'
import { StructuredSummary, type StructuredSummaryData } from '@/components/dashboard/structured-summary'
import { ActionItemsPopup, type ActionItemTask } from '@/components/dashboard/action-items-popup'
import { updateNoteContent, createNote, deleteNote } from '@/app/actions/meetings'
import { formatDate, formatDuration } from '@/lib/utils'

type Tab = 'notes' | 'ai' | 'email' | 'chat'
type SaveStatus = 'saved' | 'saving' | 'unsaved'
interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ── Meeting type helpers ───────────────────────────────────────────────────
const MEETING_TYPE_STYLES: Record<string, { label: string; pill: string }> = {
  '1-on-1':             { label: '1-on-1',           pill: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  'Customer Discovery': { label: 'Discovery',         pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  'Sales Call':         { label: 'Sales Call',        pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  'User Interview':     { label: 'User Interview',    pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  'Daily Standup':      { label: 'Standup',           pill: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
}

function detectMeetingType(meetingNotes: Note[]): string | null {
  if (!meetingNotes.length) return null
  // 1. Note title matches a known template name (set at creation time)
  for (const note of meetingNotes) {
    if (MEETING_TYPE_STYLES[note.title]) return note.title
  }
  // 2. Content-based fallback for older notes
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

function MeetingTypePill({ type, className = '' }: { type: string; className?: string }) {
  const style = MEETING_TYPE_STYLES[type]
  if (!style) return null
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${style.pill} ${className}`}>
      {style.label}
    </span>
  )
}

interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

interface NotesPageClientProps {
  meetings: Meeting[]
  notesByMeeting: Record<string, Note[]>
  selectedNoteId: string | null
  currentUser: CurrentUser
  jiraConfig?: JiraConfig | null
}

export function NotesPageClient({ meetings, notesByMeeting, selectedNoteId, currentUser, jiraConfig }: NotesPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')

  // ?meeting=id navigates to first note of that meeting
  const meetingParam = searchParams.get('meeting')

  // Derive selected note
  const allNotes = Object.values(notesByMeeting).flat()
  const resolvedNoteId = selectedNoteId
    ?? (meetingParam ? (notesByMeeting[meetingParam]?.[0]?.id ?? null) : null)
  const activeNote = resolvedNoteId
    ? allNotes.find((n) => n.id === resolvedNoteId) ?? allNotes[0] ?? null
    : allNotes[0] ?? null
  const activeMeeting = activeNote
    ? meetings.find((m) => m.id === activeNote.meetingId) ?? null
    : null

  // Which meetings are expanded in accordion
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    // expand meeting of active note by default
    if (activeNote) init[activeNote.meetingId] = true
    // also expand meetingParam if provided
    if (meetingParam) init[meetingParam] = true
    return init
  })

  // When arriving via ?meeting=, replace URL with ?note= for clean state
  useEffect(() => {
    if (meetingParam && activeNote) {
      router.replace(`/dashboard/notes?note=${activeNote.id}`, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [creating, setCreating] = useState<string | null>(null) // meetingId being created for
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [, startTransition] = useTransition()

  function selectNote(noteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('note', noteId)
    router.push(`/dashboard/notes?${params.toString()}`, { scroll: false })
    setMobileView('editor')
  }

  function toggleExpand(meetingId: string) {
    setExpanded((prev) => ({ ...prev, [meetingId]: !prev[meetingId] }))
  }

  async function handleCreateNote(meetingId: string) {
    if (!newNoteTitle.trim()) return
    setCreating(null)
    setNewNoteTitle('')
    startTransition(async () => {
      const result = await createNote(meetingId, newNoteTitle.trim())
      if (result.note) {
        router.refresh()
        selectNote(result.note.id)
      }
    })
  }

  async function handleDeleteNote(noteId: string, meetingId: string) {
    const notesForMeeting = notesByMeeting[meetingId] ?? []
    if (notesForMeeting.length <= 1) return // don't delete last note
    await deleteNote(noteId)
    router.refresh()
    // select another note for same meeting
    const other = notesForMeeting.find((n) => n.id !== noteId)
    if (other) selectNote(other.id)
  }

  return (
    <div className="flex flex-1 -mx-4 -mt-16 -mb-4 md:-mx-8 md:-mt-8 md:-mb-8 h-full md:h-auto">
      {/* ── Left accordion sidebar ── */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] shrink-0 border-r border-border flex-col overflow-hidden bg-background h-full md:h-auto`}>
        <div className="px-5 py-4 border-b border-border shrink-0">
          <h1 className="text-[17px] font-bold text-foreground tracking-tight">Notes</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{meetings.length} meetings</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {meetings.length === 0 && (
            <p className="text-[13px] text-muted-foreground px-5 py-4">No meetings yet.</p>
          )}

          {meetings.map((meeting) => {
            const meetingNotes = notesByMeeting[meeting.id] ?? []
            const isOpen = !!expanded[meeting.id]
            const meetingType = detectMeetingType(meetingNotes)

            return (
              <div key={meeting.id}>
                {/* Meeting row - accordion header */}
                <button
                  onClick={() => toggleExpand(meeting.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 text-left group active:scale-[0.98]"
                  style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
                >
                  <ChevronRight
                    className="size-3.5 text-muted-foreground shrink-0"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground truncate">{meeting.title}</p>
                      {meetingType && <MeetingTypePill type={meetingType} />}
                    </div>
                    <p className="text-[12px] text-muted-foreground">{formatDate(meeting.createdAt)} · {meetingNotes.length} note{meetingNotes.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>

                {/* Notes list */}
                {isOpen && (
                  <div className="pl-6 pr-3 pb-1">
                    {meetingNotes.map((note) => {
                      const active = note.id === activeNote?.id
                      const hasAI = !!(note.summary || note.actionItems)
                      return (
                        <div
                          key={note.id}
                          className={`group flex items-center gap-1 rounded-lg mb-0.5 ${active ? 'bg-indigo-500/8 border border-indigo-500/15' : 'hover:bg-muted/40 border border-transparent'}`}
                          style={{ transition: 'background-color 120ms ease-out, border-color 120ms ease-out' }}
                        >
                          <button
                            onClick={() => selectNote(note.id)}
                            className="flex-1 flex items-center gap-2 px-2.5 py-2 text-left min-w-0 active:opacity-70"
                            style={{ transition: 'opacity 100ms ease-out' }}
                          >
                            {hasAI
                              ? <Sparkles className={`size-3 shrink-0 ${active ? 'text-indigo-400' : 'text-muted-foreground/60'}`} />
                              : <FileText className={`size-3 shrink-0 ${active ? 'text-indigo-400' : 'text-muted-foreground/40'}`} />
                            }
                            <span className={`text-[13px] truncate ${active ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-foreground/80'}`}>
                              {note.title}
                            </span>
                          </button>
                          {meetingNotes.length > 1 && (
                            <button
                              onClick={() => handleDeleteNote(note.id, meeting.id)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 shrink-0 active:scale-[0.85]"
                              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), opacity 120ms ease-out, color 120ms ease-out' }}
                              title="Delete note"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* New note input or button */}
                    {creating === meeting.id ? (
                      <div className="mt-1 flex gap-1">
                        <input
                          autoFocus
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateNote(meeting.id)
                            if (e.key === 'Escape') { setCreating(null); setNewNoteTitle('') }
                          }}
                          placeholder="Note title…"
                          className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-indigo-500/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          onBlur={() => { if (!newNoteTitle.trim()) { setCreating(null) } }}
                        />
                        <button
                          onClick={() => handleCreateNote(meeting.id)}
                          className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-500 active:scale-[0.94]"
                          style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCreating(meeting.id); setNewNoteTitle(''); setExpanded((p) => ({ ...p, [meeting.id]: true })) }}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-0.5 active:scale-[0.97]"
                        style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 120ms ease-out, background-color 120ms ease-out' }}
                      >
                        <Plus className="size-3" />
                        New note
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: note editor ── */}
      <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 overflow-hidden h-full md:h-auto`}>
        {/* Mobile back button */}
        <button
          onClick={() => setMobileView('list')}
          className="md:hidden flex items-center gap-1.5 px-4 py-3 border-b border-border text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft className="size-4" />
          Back to notes
        </button>
        {activeNote && activeMeeting ? (
          <NoteEditor
            meeting={activeMeeting}
            note={activeNote}
            currentUser={currentUser}
            meetingType={detectMeetingType(notesByMeeting[activeMeeting.id] ?? [])}
            jiraConfig={jiraConfig}
            key={activeNote.id}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-4">
              <FileText className="size-5 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-foreground">Select a note</p>
            <p className="text-[13px] text-muted-foreground mt-1">Click a meeting to expand its notes</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Note editor (right panel)
// ─────────────────────────────────────────────
function NoteEditor({ meeting, note, currentUser, meetingType, jiraConfig }: { meeting: Meeting; note: Note; currentUser: CurrentUser; meetingType: string | null; jiraConfig?: { domain: string; email: string; apiToken: string; projectKey: string } | null }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [content, setContent] = useState(note.content ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [generating, setGenerating] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [showActionItems, setShowActionItems] = useState(false)
  const [popupActionItems, setPopupActionItems] = useState<ActionItemTask[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [, startTransition] = useTransition()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isProcessing = meeting.status === 'processing' || generating
  const hasAI = !!(note.summary || note.actionItems || note.followUpEmail)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => startTransition(() => router.refresh()), 3000)
    return () => clearInterval(interval)
  }, [isProcessing, router])

  useEffect(() => {
    if (!isProcessing && hasAI && activeTab === 'notes') setActiveTab('ai')
  }, [isProcessing, hasAI]) // eslint-disable-line react-hooks/exhaustive-deps


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
      await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      })
      router.refresh()
      setActiveTab('ai')
    } finally {
      setGenerating(false)
    }
  }

  async function handleNotesFill() {
    setAiFilling(true)
    try {
      const res = await fetch('/api/ai/notes-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      })
      const json = await res.json()
      if (!res.ok) return
      // Set content - TipTap picks it up via its useEffect
      setContent(json.html)
      setSaveStatus('unsaved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        await updateNoteContent(meeting.id, json.html, note.id)
        setSaveStatus('saved')
      }, 800)
    } finally {
      setAiFilling(false)
    }
  }

  function handlePushToJira() {
    // Parse tasks from structured data first (richer), fall back to raw action items
    let tasks: ActionItemTask[] = []
    if (structuredData?.actionItems?.length) {
      tasks = structuredData.actionItems.map((a) => ({
        text: a.text,
        assignee: a.assignee ?? '',
        deadline: a.deadline ?? '',
        priority: (['high', 'medium', 'low'] as const).includes(a.priority as ActionItemTask['priority'])
          ? (a.priority as ActionItemTask['priority'])
          : 'medium',
      }))
    } else if (note.actionItems) {
      try {
        const parsed: unknown = JSON.parse(note.actionItems)
        if (Array.isArray(parsed)) {
          tasks = parsed.map((item) => {
            if (typeof item === 'string') return { text: item, assignee: '', deadline: '', priority: 'medium' as const }
            return {
              text: (item as ActionItemTask).text ?? String(item),
              assignee: (item as ActionItemTask).assignee ?? '',
              deadline: (item as ActionItemTask).deadline ?? '',
              priority: (['high', 'medium', 'low'] as const).includes((item as ActionItemTask).priority)
                ? (item as ActionItemTask).priority
                : 'medium',
            }
          })
        }
      } catch { /* ignore */ }
    }
    setPopupActionItems(tasks)
    setShowActionItems(true)
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: text }
    const msgs = [...chatMessages, userMsg]
    setChatMessages(msgs)
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, messages: msgs }),
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

  const serif = { fontFamily: 'var(--font-bitter), var(--font-playfair), Georgia, serif' } as const

  let actionItems: string[] = []
  if (note.actionItems) { try { actionItems = JSON.parse(note.actionItems) } catch { actionItems = [] } }

  let structuredData: StructuredSummaryData | null = null
  if (note.summaryStructured) {
    try { structuredData = JSON.parse(note.summaryStructured) } catch { structuredData = null }
  }

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'notes',  label: 'Notes',      shortLabel: 'Notes',  icon: <FileText className="size-4" /> },
    { id: 'ai',     label: 'AI Summary', shortLabel: 'AI',     icon: <Sparkles className="size-4" /> },
    { id: 'email',  label: 'Follow-up',  shortLabel: 'Email',  icon: <Mail className="size-4" /> },
    { id: 'chat',   label: 'Chat',       shortLabel: 'Chat',   icon: <MessageSquare className="size-4" /> },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full md:h-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-[0.1em] truncate">{meeting.title}</span>
              {meetingType && <MeetingTypePill type={meetingType} />}
            </div>
            <h2 className="text-[22px] font-bold text-foreground tracking-tight leading-snug">{note.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                <Calendar className="size-3" />
                {formatDate(meeting.createdAt)}
              </span>
              {(meeting.durationSeconds ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                  <Clock className="size-3" />
                  {formatDuration(meeting.durationSeconds ?? 0)}
                </span>
              )}
            </div>
          </div>

          {meeting.status === 'completed' && !hasAI && (
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5 shrink-0 mt-1"
            >
              {generating
                ? <ShiningText text="Generating…" className="text-[13px]" />
                : <><Wand2 className="size-3.5" />Generate AI Notes</>
              }
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border shrink-0">
        <div className="flex items-center overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 md:px-4 py-3.5 md:py-4 text-[13px] md:text-[15px] font-medium whitespace-nowrap shrink-0 active:scale-[0.95] ${
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 150ms ease-out' }}
            >
              {tab.icon}
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'ai' && isProcessing && <span className="size-2 rounded-full bg-amber-400 animate-pulse" />}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-foreground" />
              )}
            </button>
          ))}
          {/* Desktop-only tab actions */}
          <div className="ml-auto hidden md:flex items-center gap-2.5 px-4 py-2 shrink-0">
            {activeTab === 'notes' && meeting.status === 'completed' && (
              <button onClick={handleNotesFill} disabled={aiFilling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium border border-indigo-500/30 bg-indigo-500/8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 active:scale-[0.97] disabled:opacity-50"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}>
                {aiFilling ? <><Loader2 className="size-4 animate-spin" />Filling…</> : <><Sparkles className="size-4" />Fill by Notus</>}
              </button>
            )}
            {activeTab === 'notes' && (
              <span className="text-[14px]" style={{ color: saveStatus === 'saved' ? 'var(--muted-foreground)' : saveStatus === 'saving' ? 'var(--foreground)' : '#f59e0b', opacity: saveStatus === 'saved' ? 0.45 : 1, transition: 'color 200ms ease-out, opacity 200ms ease-out' }}>
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
              </span>
            )}
            {activeTab === 'ai' && meeting.status === 'completed' && hasAI && (
              <button onClick={handlePushToJira}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-blue-500/30 bg-blue-500/8 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 active:scale-[0.97]"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}>
                <ExternalLink className="size-3.5" />Push to Jira
              </button>
            )}
            {activeTab === 'ai' && meeting.status === 'completed' && (
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97] disabled:opacity-50"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out, color 150ms ease-out' }}>
                {generating ? <><Loader2 className="size-3.5 animate-spin" />{hasAI ? 'Regenerating…' : 'Generating…'}</> : <><Wand2 className="size-3.5" />{hasAI ? 'Regenerate AI' : 'Generate AI'}</>}
              </button>
            )}
          </div>
        </div>

        {/* Mobile-only action bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-t border-border/60">
          {activeTab === 'notes' && (
            <>
              {meeting.status === 'completed' && (
                <button onClick={handleNotesFill} disabled={aiFilling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-indigo-500/30 bg-indigo-500/8 text-indigo-600 dark:text-indigo-400 active:scale-[0.97] disabled:opacity-50">
                  {aiFilling ? <><Loader2 className="size-3.5 animate-spin" />Filling…</> : <><Sparkles className="size-3.5" />Fill by Notus</>}
                </button>
              )}
              <span className="ml-auto text-[12px]" style={{ color: saveStatus === 'saved' ? 'var(--muted-foreground)' : saveStatus === 'saving' ? 'var(--foreground)' : '#f59e0b', opacity: saveStatus === 'saved' ? 0.45 : 1 }}>
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
              </span>
            </>
          )}
          {activeTab === 'ai' && meeting.status === 'completed' && (
            <>
              {hasAI && (
                <button onClick={handlePushToJira}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-blue-500/30 bg-blue-500/8 text-blue-600 dark:text-blue-400 active:scale-[0.97]">
                  <ExternalLink className="size-3.5" />Push to Jira
                </button>
              )}
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground active:scale-[0.97] disabled:opacity-50">
                {generating ? <><Loader2 className="size-3.5 animate-spin" />{hasAI ? 'Regenerating…' : 'Generating…'}</> : <><Wand2 className="size-3.5" />{hasAI ? 'Regenerate AI' : 'Generate AI'}</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'notes' && (
        <div className="flex-1 overflow-hidden min-h-0 md:min-h-0">
          <TiptapEditor
            content={parseAgendaContent(content) ? '' : content}
            onChange={handleContentChange}
            editable={meeting.status !== 'processing'}
            placeholder="Start writing your notes… or click AI Fill to generate from the transcript."
          />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0 md:min-h-0">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <ShiningText text="Generating AI summary…" className="text-[16px]" />
            </div>
          ) : hasAI ? (
            structuredData ? (
              <StructuredSummary data={structuredData} />
            ) : (
              <>
                {note.summary && (
                  <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-indigo-500" />
                      <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Summary</p>
                    </div>
                    <p className="text-foreground" style={{ ...serif, fontSize: '17px', fontWeight: 500, lineHeight: '1.85', letterSpacing: '0.005em' }}>{note.summary}</p>
                  </section>
                )}
                {actionItems.length > 0 && (
                  <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Action Items</p>
                    </div>
                    <ul className="space-y-3">
                      {actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="size-5 rounded-md border-2 border-emerald-500/40 mt-0.5 shrink-0" />
                          <span className="text-foreground" style={{ ...serif, fontSize: '16px', fontWeight: 500, lineHeight: '1.7' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="size-14 rounded-2xl bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center mb-4">
                <Wand2 className="size-6 text-indigo-400" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-semibold text-foreground mb-1.5">No AI summary yet</p>
              <p className="text-[13px] text-muted-foreground mb-5">
                {meeting.status === 'completed' ? 'Click "Generate AI Notes" to summarise this meeting.' : 'AI runs automatically after recording ends.'}
              </p>
              {meeting.status === 'completed' && (
                <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                  {generating ? <ShiningText text="Generating…" className="text-[13px]" /> : <><Wand2 className="size-3.5" />Generate AI Notes</>}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'email' && (
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 md:min-h-0">
          {note.followUpEmail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-amber-500" />
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Follow-up Email</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(note.followUpEmail!); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000) }} className="h-7 px-2.5 text-[12px] gap-1.5">
                  {copiedEmail ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
                </Button>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <pre className="text-foreground whitespace-pre-wrap leading-[1.85]" style={{ ...serif, fontSize: '16px', fontWeight: 500 }}>{note.followUpEmail}</pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Mail className="size-10 text-muted-foreground/30 mb-3" strokeWidth={1} />
              <p className="text-[14px] font-medium text-foreground">No follow-up email yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Generated when AI notes are created</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageSquare className="size-8 text-muted-foreground/30 mb-2" strokeWidth={1} />
                <p className="text-[13px] text-muted-foreground">Ask anything about this meeting</p>
              </div>
            ) : chatMessages.map((msg, i) => (
              <div key={i} className={`flex animate-chat-msg ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(i * 25, 100)}ms` }}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : msg.content ? (
                    <TypewriterText text={msg.content} speed={8} />
                  ) : (chatLoading && i === chatMessages.length - 1) ? (
                    <ShiningText text="Thinking…" className="text-[13px]" />
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()} placeholder="Ask about this meeting…" disabled={chatLoading} className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} className="text-indigo-500 disabled:text-muted-foreground/40 active:scale-[0.85] shrink-0" style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 120ms ease-out' }}>
                {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionItemsPopup
        items={popupActionItems}
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        open={showActionItems}
        onClose={() => setShowActionItems(false)}
        onCreateInNotus={() => setShowActionItems(false)}
        jiraConfig={jiraConfig}
      />
    </div>
  )
}

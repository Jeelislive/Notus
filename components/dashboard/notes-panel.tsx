'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles, MessageSquare, Copy, Check, Send, Loader2, CheckSquare, Mail } from 'lucide-react'
import type { Note, Template } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { updateNoteContent } from '@/app/actions/meetings'

type Tab = 'notes' | 'ai' | 'email' | 'chat'
type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface NotesPanelProps {
  note: Note | null
  meetingId: string
  meetingTitle: string
  status: string
  userTemplates: Template[]
}

export function NotesPanel({ note, meetingId, meetingTitle, status, userTemplates: _userTemplates }: NotesPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [content, setContent] = useState(note?.content ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [copied, setCopied] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [, startTransition] = useTransition()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isProcessing = status === 'processing'
  const hasAI = !!(note?.summary || note?.actionItems || note?.followUpEmail)

  // Poll for AI completion when processing
  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => {
      startTransition(() => router.refresh())
    }, 3000)
    return () => clearInterval(interval)
  }, [isProcessing, router])

  // Auto-switch to AI tab when processing completes
  useEffect(() => {
    if (!isProcessing && hasAI && (activeTab === 'notes' || activeTab === 'email')) {
      setActiveTab('ai')
    }
  }, [isProcessing, hasAI]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleContentChange = useCallback((html: string) => {
    setContent(html)
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await updateNoteContent(meetingId, html)
      setSaveStatus('saved')
    }, 2000)
  }, [meetingId])

  function handleTemplateApply(templateContent: string) {
    setContent(templateContent)
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await updateNoteContent(meetingId, templateContent)
      setSaveStatus('saved')
    }, 500)
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, meetingTitle, messages: newMessages }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')

      const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
      setChatMessages((prev) => [...prev, assistantMsg])

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
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              setChatMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + delta,
                }
                return updated
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      console.error('[Chat]', err)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function copyEmail() {
    if (!note?.followUpEmail) return
    navigator.clipboard.writeText(note.followUpEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'notes', label: 'Notes', icon: <FileText className="size-3.5" /> },
    { id: 'ai', label: 'AI Summary', icon: <Sparkles className="size-3.5" /> },
    { id: 'email', label: 'Follow-up', icon: <Mail className="size-3.5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="size-3.5" /> },
  ]

  return (
    <div className="flex flex-col rounded-2xl border border-border overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium active:scale-[0.95] ${
                activeTab === tab.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, color 120ms ease-out' }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'ai' && isProcessing && (
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'notes' && <SaveIndicator status={saveStatus} />}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'notes' && (
        <div className="flex-1 overflow-hidden min-h-0">
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            editable={status !== 'processing'}
            placeholder={
              status === 'processing'
                ? 'AI is processing your transcript…'
                : 'Take notes here. Try a template to get started →'
            }
          />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {isProcessing ? (
            <AIProcessingState />
          ) : hasAI ? (
            <AIResults note={note!} />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <Sparkles className="size-6 text-muted-foreground/40" strokeWidth={1} />
              </div>
              <p className="text-[14px] font-medium text-foreground">No AI summary yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">AI analysis runs automatically after recording ends</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'email' && (
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {note?.followUpEmail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-amber-500" />
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Follow-up Email</p>
                </div>
                <Button size="sm" variant="ghost" onClick={copyEmail} className="h-7 px-2.5 text-[12px] gap-1.5">
                  {copied ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
                </Button>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <pre
                  className="text-foreground whitespace-pre-wrap leading-[1.85]"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '16px', fontWeight: 500, letterSpacing: '0.005em' }}
                >
                  {note.followUpEmail}
                </pre>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="size-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 mb-3 animate-spin" />
              <p className="text-[13px] text-muted-foreground">Generating follow-up email…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <Mail className="size-6 text-muted-foreground/40" strokeWidth={1} />
              </div>
              <p className="text-[14px] font-medium text-foreground">No follow-up email yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Generated automatically after recording ends</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageSquare className="size-8 text-muted-foreground/30 mb-2" strokeWidth={1} />
                <p className="text-[13px] text-muted-foreground">Ask anything about this meeting</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex animate-chat-msg ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(i * 30, 120)}ms` }}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.content || (chatLoading && i === chatMessages.length - 1 ? <TypingDots /> : '')}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="Ask about this meeting…"
                disabled={chatLoading}
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="text-primary disabled:text-muted-foreground/40 active:scale-[0.85] shrink-0"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 120ms ease-out' }}
              >
                {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saved') return <span className="text-[12px] text-muted-foreground/50">Saved</span>
  if (status === 'saving') return <span className="text-[12px] text-muted-foreground">Saving…</span>
  return <span className="text-[12px] text-amber-500">Unsaved</span>
}

function AIProcessingState() {
  const steps = ['Analyzing transcript', 'Generating summary', 'Extracting action items', 'Writing follow-up email']
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-xl bg-muted flex items-center justify-center">
          <Sparkles className="size-4 text-muted-foreground animate-pulse" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground">AI is analyzing your meeting</p>
          <p className="text-[12px] text-muted-foreground">This usually takes 10–30 seconds</p>
        </div>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1">
            <div className="size-5 rounded-full border-2 border-border border-t-foreground animate-spin shrink-0" style={{ animationDelay: `${i * 150}ms` }} />
            <span className="text-[13px] text-muted-foreground">{step}…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIResults({ note }: { note: Note }) {
  let actionItems: string[] = []
  if (note.actionItems) {
    try { actionItems = JSON.parse(note.actionItems) } catch { actionItems = [] }
  }

  const playfairStyle = { fontFamily: 'var(--font-playfair), Georgia, serif' } as const

  return (
    <div className="space-y-5">
      {note.summary && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Summary</p>
          </div>
          <p
            className="text-foreground"
            style={{ ...playfairStyle, fontSize: '17px', fontWeight: 500, lineHeight: '1.85', letterSpacing: '0.005em' }}
          >
            {note.summary}
          </p>
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
                <span
                  className="text-foreground"
                  style={{ ...playfairStyle, fontSize: '16px', fontWeight: 500, lineHeight: '1.7', letterSpacing: '0.005em' }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Clock, Send, Loader2, Pencil, Trash2,
  MoreHorizontal, FileText, Sparkles, FolderOpen,
  CheckCircle2, AlertCircle,
  Zap,
} from 'lucide-react'
import type { Folder, Meeting } from '@/lib/db/schema'
import { getFolderIcon } from '@/lib/folder-icons'
import { deleteFolder, updateFolder } from '@/app/actions/folders'
import { toast } from '@/hooks/use-toast'
import { formatDuration } from '@/lib/utils'
import { TypewriterText } from '@/components/ui/typewriter-text'
import { ShiningText } from '@/components/ui/shining-text'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type FolderWithMeetings = Folder & { meetings: Meeting[] }

interface ProposedMeeting {
  id: string
  title: string
  status: string | null
  createdAt: Date | string
  durationSeconds: number | null
}
interface PendingAction {
  kind: 'move_to_folder' | 'remove_from_folder'
  folderId: string
  folderName: string
  meetings: ProposedMeeting[]
  reasoning: string
  label: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  pendingAction?: PendingAction
  actionStatus?: 'pending' | 'executing' | 'done' | 'cancelled'
}

// ── Commands ──────────────────────────────────────────────────────────────────
// type: 'agent' → calls /api/ai/folder-agent (scans ALL user meetings, needs approval)
// type: 'chat'  → calls /api/ai/chat (works within this folder's meetings, streaming)

const COMMANDS = [
  {
    id: 'auto-fill',
    label: '/auto-fill',
    description: 'Find & move relevant meetings here',
    type: 'agent' as const,
    agentMessage: 'Go through all my meetings and move every meeting that is relevant to this folder.',
    icon: '→',
  },
  {
    id: 'clean-up',
    label: '/clean-up',
    description: 'Remove meetings that don\'t belong',
    type: 'agent' as const,
    agentMessage: 'Review the meetings in this folder and remove any that are not relevant.',
    icon: '×',
  },
  {
    id: 'summarize',
    label: '/summarize',
    description: 'Summarize all meetings',
    type: 'chat' as const,
    chatMessage: 'Give me a concise summary of all meetings in this folder.',
    icon: '≡',
  },
  {
    id: 'action-items',
    label: '/action-items',
    description: 'List all action items',
    type: 'chat' as const,
    chatMessage: 'List all action items and to-dos from meetings in this folder.',
    icon: '✓',
  },
  {
    id: 'decisions',
    label: '/decisions',
    description: 'Key decisions made',
    type: 'chat' as const,
    chatMessage: 'What were the key decisions made across all meetings in this folder?',
    icon: '◆',
  },
  {
    id: 'blockers',
    label: '/blockers',
    description: 'Open questions & blockers',
    type: 'chat' as const,
    chatMessage: 'List all open questions, blockers, and unresolved items from meetings in this folder.',
    icon: '?',
  },
] as const

type Command = typeof COMMANDS[number]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getDateLabel(date: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff <= 6) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function groupByDate(meetings: Meeting[]) {
  const map = new Map<string, Meeting[]>()
  for (const m of meetings) {
    const label = getDateLabel(new Date(m.createdAt))
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(m)
  }
  return Array.from(map.entries()).map(([label, meetings]) => ({ label, meetings }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FolderViewClient({ folder }: { folder: FolderWithMeetings }) {
  const router = useRouter()
  const [localMeetings, setLocalMeetings] = useState<Meeting[]>(folder.meetings)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdFilter, setCmdFilter] = useState('')
  const [cmdIndex, setCmdIndex] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [editDesc, setEditDesc] = useState(folder.description ?? '')
  const [editIcon, setEditIcon] = useState(folder.icon)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const filteredCmds = COMMANDS.filter((c) =>
    c.label.includes(cmdFilter.toLowerCase()) || c.description.toLowerCase().includes(cmdFilter.slice(1).toLowerCase())
  )

  function handleInputChange(val: string) {
    setChatInput(val)
    if (val.startsWith('/')) {
      setCmdFilter(val)
      setCmdOpen(true)
      setCmdIndex(0)
    } else {
      setCmdOpen(false)
      setCmdFilter('')
      setCmdIndex(0)
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!cmdOpen) {
      if (e.key === 'Enter' && !e.shiftKey) sendChatMessage()
      return
    }
    if (e.key === 'Escape') { setCmdOpen(false); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCmdIndex((i) => (i + 1) % filteredCmds.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCmdIndex((i) => (i - 1 + filteredCmds.length) % filteredCmds.length)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (filteredCmds[cmdIndex]) runCommand(filteredCmds[cmdIndex])
    }
  }

  function runCommand(cmd: Command) {
    setCmdOpen(false)
    setChatInput('')
    if (cmd.type === 'agent') {
      executeAgentCommand(cmd)
    } else {
      sendChatMessage(cmd.chatMessage, cmd.label)
    }
  }

  // ── Agent command: analyze all meetings, return approval card ────────────────

  async function executeAgentCommand(cmd: Extract<Command, { type: 'agent' }>) {
    const displayMsg = cmd.label
    const userMsg: ChatMessage = { role: 'user', content: displayMsg }
    setChatMessages((p) => [...p, userMsg, { role: 'assistant', content: '' }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/folder-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          folderName: folder.name,
          folderDescription: folder.description ?? '',
          message: cmd.agentMessage,
        }),
      })

      if (!res.ok) throw new Error('AI error')
      const data = await res.json()

      if (data.type === 'action') {
        const action = data.action as PendingAction
        const content = action.meetings.length === 0
          ? action.reasoning
          : `I found ${action.meetings.length} meeting${action.meetings.length !== 1 ? 's' : ''} to ${action.kind === 'move_to_folder' ? 'move into' : 'remove from'} "${action.folderName}". Review below and approve if correct.`

        setChatMessages((p) => {
          const updated = [...p]
          updated[updated.length - 1] = {
            role: 'assistant',
            content,
            pendingAction: action.meetings.length > 0 ? action : undefined,
            actionStatus: action.meetings.length > 0 ? 'pending' : undefined,
          }
          return updated
        })
      } else {
        setChatMessages((p) => {
          const updated = [...p]
          updated[updated.length - 1] = { role: 'assistant', content: data.reply ?? 'No response.' }
          return updated
        })
      }
    } catch {
      setChatMessages((p) => {
        const updated = [...p]
        updated[updated.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setChatLoading(false)
    }
  }

  // ── Regular chat: streaming SSE, scoped to this folder's meetings ────────────

  async function sendChatMessage(override?: string, displayOverride?: string) {
    const text = (override ?? chatInput).trim()
    if (!text || chatLoading) return

    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: displayOverride ?? text }
    setChatMessages((p) => [...p, userMsg, { role: 'assistant', content: '' }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          meetingIds: localMeetings.map((m) => m.id),
          folderName: folder.name,
          folderDescription: folder.description ?? '',
          meetingTitles: localMeetings.map((m) => m.title),
        }),
      })

      if (!res.ok) throw new Error('AI error')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            accumulated += delta
            const snap = accumulated
            setChatMessages((p) => {
              const updated = [...p]
              updated[updated.length - 1] = { role: 'assistant', content: snap }
              return updated
            })
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch {
      setChatMessages((p) => {
        const updated = [...p]
        updated[updated.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setChatLoading(false)
    }
  }

  // ── Approval actions ─────────────────────────────────────────────────────────

  async function handleApproveAction(msgIndex: number) {
    const msg = chatMessages[msgIndex]
    if (!msg.pendingAction) return

    setChatMessages((p) => {
      const updated = [...p]
      updated[msgIndex] = { ...updated[msgIndex], actionStatus: 'executing' }
      return updated
    })

    try {
      const { kind, folderId: targetFolderId, meetings: proposed } = msg.pendingAction
      const res = await fetch('/api/ai/folder-agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, meetingIds: proposed.map((m) => m.id), folderId: targetFolderId }),
      })

      if (!res.ok) throw new Error('Execute failed')

      const count = proposed.length
      const verb = kind === 'move_to_folder' ? 'Moved' : 'Removed'
      const titles = proposed.map((m) => `"${m.title}"`).join(', ')

      // Update meeting list instantly — no page refresh needed
      if (kind === 'move_to_folder') {
        const newMeetings = proposed.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          folderId: targetFolderId,
          userId: '',
          updatedAt: new Date(),
          language: null,
          transcriptionProvider: null,
        })) as unknown as Meeting[]
        setLocalMeetings((prev) => [...prev, ...newMeetings])
      } else {
        const removedIds = new Set(proposed.map((m) => m.id))
        setLocalMeetings((prev) => prev.filter((m) => !removedIds.has(m.id)))
      }

      setChatMessages((p) => {
        const updated = [...p]
        updated[msgIndex] = {
          ...updated[msgIndex],
          content: `${verb} ${count} meeting${count !== 1 ? 's' : ''}: ${titles}.`,
          actionStatus: 'done',
        }
        return updated
      })
      toast(`${verb} ${count} meeting${count !== 1 ? 's' : ''}`, { variant: 'success' })
    } catch {
      setChatMessages((p) => {
        const updated = [...p]
        updated[msgIndex] = { ...updated[msgIndex], actionStatus: 'pending' }
        return updated
      })
      toast('Failed to apply. Please try again.', { variant: 'destructive' })
    }
  }

  function handleCancelAction(msgIndex: number) {
    setChatMessages((p) => {
      const updated = [...p]
      updated[msgIndex] = { ...updated[msgIndex], content: 'Action cancelled.', actionStatus: 'cancelled' }
      return updated
    })
  }

  // ── Edit / delete folder ──────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!editName.trim() || saving) return
    setSaving(true)
    await updateFolder(folder.id, editName, editDesc, editIcon)
    toast('Folder updated', { variant: 'success' })
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    await deleteFolder(folder.id)
    toast('Folder deleted', { variant: 'success' })
    router.push('/dashboard')
  }

  const groups = groupByDate(localMeetings)

  return (
    <div className="fixed inset-0 flex" style={{ left: 'var(--sidebar-width, 0px)' }}>

      {/* ── Left: folder content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 md:px-8 pt-7 pb-5 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit">
            <ArrowLeft className="size-3.5" />
            All meetings
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {(() => { const Icon = getFolderIcon(folder.icon); return (
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
              ) })()}
              <div>
                <h1 className="text-[24px] text-foreground leading-tight font-semibold">{folder.name}</h1>
                {folder.description && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">{folder.description}</p>
                )}
                <p className="text-[12px] text-muted-foreground/60 mt-1">
                  {localMeetings.length} meeting{localMeetings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />Rename folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-3.5" />Delete folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-8">
          {localMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="size-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
                <FolderOpen className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-medium text-foreground mb-1">No meetings in this folder</p>
              <p className="text-[13px] text-muted-foreground max-w-xs">
                Use <span className="font-mono text-[12px] bg-muted px-1 py-0.5 rounded">/auto-fill</span> in the chat to let AI find relevant meetings, or add manually via ··· on any meeting.
              </p>
            </div>
          ) : (
            groups.map(({ label, meetings }) => (
              <div key={label}>
                <div className="px-6 md:px-8 pt-6 pb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.1em]">{label}</p>
                </div>
                {meetings.map((m) => {
                  const duration = (m.durationSeconds ?? 0) > 0 ? formatDuration(m.durationSeconds ?? 0) : null
                  return (
                    <Link
                      key={m.id}
                      href={`/dashboard/notes?meeting=${m.id}`}
                      className="group flex items-center gap-3.5 px-6 md:px-8 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full shrink-0 ${m.status === 'completed' ? 'bg-emerald-400' : m.status === 'recording' ? 'bg-red-400 animate-pulse' : 'bg-zinc-400'}`} />
                          <p className="text-[14px] font-medium text-foreground truncate">{m.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                          <span className="text-[11.5px] text-muted-foreground/70">{formatTime(new Date(m.createdAt))}</span>
                          {duration && (
                            <>
                              <span className="text-[11px] text-muted-foreground/30">·</span>
                              <span className="text-[11.5px] text-muted-foreground/70 flex items-center gap-1">
                                <Clock className="size-2.5" />{duration}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Sparkles className="size-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: AI chat sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[520px] xl:w-[580px] border-l border-border bg-muted/10 dark:bg-muted/5 shrink-0">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Notus AI</p>
          <p className="text-[16px] font-semibold text-foreground">{folder.name}</p>
        </div>

        {/* Commands palette */}
        <div className="px-4 py-4 border-b border-border">
          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-3">Commands</p>
          <div className="space-y-1">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => runCommand(cmd)}
                disabled={chatLoading}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-40 text-left group"
              >
                <span className={`font-mono text-[13.5px] font-bold shrink-0 w-[130px] ${cmd.type === 'agent' ? 'text-amber-600 dark:text-amber-400' : 'text-[#0075de] dark:text-[#62aef0]'}`}>
                  {cmd.label}
                </span>
                <span className="text-[13px] text-muted-foreground truncate">{cmd.description}</span>
                {cmd.type === 'agent' && <Zap className="size-4 text-amber-400/70 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            ))}
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-[14px] font-medium text-muted-foreground text-center">Responses appear here</p>
              <p className="text-[13px] text-muted-foreground/60 text-center">Use a command above or type <span className="font-mono">/</span> to browse all commands</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Message bubble */}
              <div className={`max-w-[92%] px-4 py-3 rounded-xl text-[14px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-foreground text-background rounded-tr-sm'
                  : 'bg-background dark:bg-muted/40 border border-border text-foreground rounded-tl-sm'
              }`}>
                {msg.role === 'user'
                  ? <span className="font-mono text-[13.5px]">{msg.content}</span>
                  : msg.content ? <TypewriterText text={msg.content} speed={6} />
                  : chatLoading && i === chatMessages.length - 1 ? <ShiningText text="Thinking…" className="text-[14px]" />
                  : null}
              </div>

              {/* Approval card */}
              {msg.pendingAction && (msg.actionStatus === 'pending' || msg.actionStatus === 'executing') && (
                <div className="w-full max-w-[95%] rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-400/20 overflow-hidden shadow-sm">
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-400/25">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                      {msg.pendingAction.label}
                    </p>
                  </div>

                  {/* Meeting list */}
                  <div className="px-4 py-2.5 space-y-1.5 max-h-44 overflow-y-auto">
                    {msg.pendingAction.meetings.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <FileText className="size-3.5 text-amber-600/60 dark:text-amber-400/60 shrink-0" />
                        <span className="text-[13px] text-amber-900 dark:text-amber-200 truncate">{m.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* AI reasoning */}
                  <div className="px-4 pb-3">
                    <p className="text-[12px] text-amber-700/80 dark:text-amber-400/70 leading-relaxed italic border-t border-amber-400/20 pt-2.5">
                      {msg.pendingAction.reasoning}
                    </p>
                  </div>

                  {/* Approve / Cancel */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-amber-400/25 bg-amber-100/40 dark:bg-amber-950/30">
                    <p className="text-[12.5px] font-medium text-amber-700 dark:text-amber-400/80 flex-1">Apply these changes?</p>
                    <button
                      onClick={() => handleCancelAction(i)}
                      disabled={msg.actionStatus === 'executing'}
                      className="px-3 py-2 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApproveAction(i)}
                      disabled={msg.actionStatus === 'executing'}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold bg-foreground hover:bg-foreground/80 text-background transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {msg.actionStatus === 'executing'
                        ? <><Loader2 className="size-3.5 animate-spin" />Applying…</>
                        : <><CheckCircle2 className="size-3.5" />Approve</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input with slash-command picker */}
        <div className="px-4 pb-4 pt-3 border-t border-border">
          {/* Slash command picker */}
          {cmdOpen && filteredCmds.length > 0 && (
            <div className="mb-2 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
              {filteredCmds.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onMouseDown={(e) => { e.preventDefault(); runCommand(cmd) }}
                  onMouseEnter={() => setCmdIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 transition-colors text-left ${idx !== 0 ? 'border-t border-border/50' : ''} ${idx === cmdIndex ? 'bg-muted/70' : 'hover:bg-muted/40'}`}
                >
                  <span className={`font-mono text-[13px] font-bold shrink-0 w-[124px] ${cmd.type === 'agent' ? 'text-amber-600 dark:text-amber-400' : 'text-[#0075de] dark:text-[#62aef0]'}`}>
                    {cmd.label}
                  </span>
                  <span className="text-[13px] text-muted-foreground truncate">{cmd.description}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background dark:bg-muted/20 px-4 py-3.5 focus-within:border-[#0075de]/50 focus-within:ring-2 focus-within:ring-[#0075de]/10 transition-all shadow-sm">
            <input
              ref={inputRef}
              value={chatInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => setTimeout(() => setCmdOpen(false), 150)}
              placeholder="Ask anything or type / for commands…"
              disabled={chatLoading}
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
            />
            <button
              onClick={() => sendChatMessage()}
              disabled={chatLoading || !chatInput.trim() || chatInput.startsWith('/')}
              className="size-9 rounded-lg flex items-center justify-center bg-[#0075de] text-white disabled:opacity-25 hover:bg-[#005bab] transition-all shrink-0 shadow-sm"
            >
              {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background focus-within:border-[#0075de]/50 transition-all">
              <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-8 text-[18px] bg-transparent focus:outline-none" maxLength={2} />
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Folder name" className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
            </div>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={!editName.trim() || saving} className="bg-[#0075de] hover:bg-[#005bab] text-white">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete folder?</DialogTitle></DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            The folder will be deleted but meetings inside it will not be affected.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

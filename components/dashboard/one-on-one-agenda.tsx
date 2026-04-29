'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChevronRight, Plus, Trash2, SlidersHorizontal,
  ArrowUpDown, Check, X, User, Sparkles, Loader2,
} from 'lucide-react'
import { updateNoteContent } from '@/app/actions/meetings'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgendaTask {
  id: string
  text: string
  completed: boolean
  priority: 'high' | 'medium' | 'low' | null
  dueDate: string | null
  assignee: string | null   // display name
  assigneeEmail: string | null
  minutes: number | null
}

export interface AgendaSection {
  id: string
  title: string
  collapsed: boolean
  tasks: AgendaTask[]
}

export interface OneOnOneAgendaData {
  __template: 'one-on-one'
  sections: AgendaSection[]
}

export interface CurrentUser {
  name: string
  email: string
  avatarUrl: string | null
}

export function parseAgendaContent(content: string): OneOnOneAgendaData | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed.__template === 'one-on-one' && Array.isArray(parsed.sections)) return parsed
  } catch { /* not JSON */ }
  return null
}

export function defaultAgendaData(): OneOnOneAgendaData {
  return {
    __template: 'one-on-one',
    sections: [
      { id: 's1', title: 'Discussion topics', collapsed: false, tasks: [] },
      { id: 's2', title: 'Action items', collapsed: false, tasks: [] },
      { id: 's3', title: 'Project updates', collapsed: false, tasks: [] },
      { id: 's4', title: 'Growth and development', collapsed: false, tasks: [] },
    ],
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

const PRIORITY_CYCLE: Array<AgendaTask['priority']> = ['high', 'medium', 'low', null]
function cyclePriority(p: AgendaTask['priority']): AgendaTask['priority'] {
  const i = PRIORITY_CYCLE.indexOf(p)
  return PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length]
}

const PRIORITY_STYLE: Record<string, string> = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  low:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
}

function Avatar({ name, avatarUrl, size = 20 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} className="rounded-full object-cover shrink-0"
         style={{ width: size, height: size }} />
  )
  return (
    <span
      className="rounded-full bg-[#0075de]/20 text-[#0075de] dark:text-[#62aef0] font-bold flex items-center justify-center uppercase shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.charAt(0)}
    </span>
  )
}

type SortKey = 'none' | 'priority' | 'dueDate'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortTasks(tasks: AgendaTask[], sort: SortKey): AgendaTask[] {
  if (sort === 'none') return tasks
  return [...tasks].sort((a, b) => {
    if (sort === 'priority') {
      const pa = a.priority ? PRIORITY_ORDER[a.priority] : 99
      const pb = b.priority ? PRIORITY_ORDER[b.priority] : 99
      return pa - pb
    }
    if (sort === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    return 0
  })
}

// ─── Grid columns ─────────────────────────────────────────────────────────────
const COLS = '32px 1fr 160px 120px 90px 80px 36px'

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialData: OneOnOneAgendaData
  meetingId: string
  noteId: string
  currentUser: CurrentUser
  editable?: boolean
}

export function OneOnOneAgenda({ initialData, meetingId, noteId, currentUser, editable = true }: Props) {
  const [data, setData] = useState<OneOnOneAgendaData>(initialData)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [sort, setSort] = useState<SortKey>('none')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const [aiFilling, setAiFilling] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Close sort menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const save = useCallback((newData: OneOnOneAgendaData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateNoteContent(meetingId, JSON.stringify(newData), noteId)
    }, 800)
  }, [meetingId, noteId])

  function mutate(newData: OneOnOneAgendaData) { setData(newData); save(newData) }

  function toggleCollapse(sectionId: string) {
    mutate({ ...data, sections: data.sections.map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s) })
  }
  function renameSectionInline(sectionId: string, title: string) {
    mutate({ ...data, sections: data.sections.map(s => s.id === sectionId ? { ...s, title } : s) })
  }
  function addSection() {
    if (!newSectionTitle.trim()) return
    mutate({ ...data, sections: [...data.sections, { id: genId(), title: newSectionTitle.trim(), collapsed: false, tasks: [] }] })
    setNewSectionTitle(''); setEditingSection(null)
  }
  function addTask(sectionId: string) {
    const newTask: AgendaTask = { id: genId(), text: '', completed: false, priority: null, dueDate: null, assignee: null, assigneeEmail: null, minutes: null }
    mutate({ ...data, sections: data.sections.map(s => s.id === sectionId ? { ...s, tasks: [...s.tasks, newTask], collapsed: false } : s) })
    return newTask.id
  }
  function updateTask(sectionId: string, taskId: string, patch: Partial<AgendaTask>) {
    mutate({ ...data, sections: data.sections.map(s => s.id !== sectionId ? s : { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) }) })
  }
  function deleteTask(sectionId: string, taskId: string) {
    mutate({ ...data, sections: data.sections.map(s => s.id !== sectionId ? s : { ...s, tasks: s.tasks.filter(t => t.id !== taskId) }) })
  }

  const totalTasks = data.sections.reduce((a, s) => a + s.tasks.length, 0)
  const doneTasks  = data.sections.reduce((a, s) => a + s.tasks.filter(t => t.completed).length, 0)

  async function handleAiFill() {
    setAiFilling(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/agenda-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          sections: data.sections.map(s => ({ id: s.id, title: s.title })),
          currentUserName: currentUser.name,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAiError(json.error ?? 'AI fill failed')
        return
      }

      // Merge AI tasks into existing sections
      const aiSections = json.sections as Record<string, Array<{
        text: string
        assignee: string | null
        assigneeDisplay: string | null
        priority: 'high' | 'medium' | 'low' | null
      }>>

      const newData: OneOnOneAgendaData = {
        ...data,
        sections: data.sections.map(section => {
          const aiTasks = aiSections[section.id]
          if (!Array.isArray(aiTasks) || aiTasks.length === 0) return section
          const newTasks = aiTasks.map(t => ({
            id: genId(),
            text: t.text,
            completed: false,
            priority: t.priority ?? null,
            dueDate: null,
            assignee: t.assigneeDisplay ?? t.assignee ?? null,
            assigneeEmail: null,
            minutes: null,
          }))
          return { ...section, tasks: [...section.tasks, ...newTasks], collapsed: false }
        }),
      }
      mutate(newData)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setAiFilling(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Toolbar ── */}
      <div className="flex flex-col shrink-0">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border gap-3">
          <div className="flex items-center gap-2">
            {editable && (
              <button
                onClick={handleAiFill}
                disabled={aiFilling}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[#0075de]/30 bg-[#0075de]/8 text-[#0075de] dark:text-[#62aef0] hover:bg-[#0075de]/15 active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}
              >
                {aiFilling
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Sparkles className="size-3.5" />
                }
                {aiFilling ? 'Filling…' : 'AI Fill'}
              </button>
            )}
          </div>

          {/* Right: filter / sort / progress */}
          <div className="flex items-center gap-2">
            {/* Incomplete filter */}
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border active:scale-[0.97] ${hideCompleted ? 'border-[#0075de]/40 bg-[#0075de]/8 text-[#0075de] dark:text-[#62aef0]' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out' }}
            >
              <SlidersHorizontal className="size-3.5" />
              {hideCompleted ? 'Showing incomplete' : 'Incomplete tasks'}
            </button>

            {/* Sort */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border active:scale-[0.97] ${sort !== 'none' ? 'border-[#0075de]/40 bg-[#0075de]/8 text-[#0075de] dark:text-[#62aef0]' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out' }}
              >
                <ArrowUpDown className="size-3.5" />
                Sort
              </button>
              {showSortMenu && (
                <div className="animate-dropdown absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 z-50">
                  {([['none', 'Default order'], ['priority', 'Priority'], ['dueDate', 'Due date']] as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setShowSortMenu(false) }}
                      className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-foreground hover:bg-muted/50"
                      style={{ transition: 'background-color 120ms ease-out' }}
                    >
                      {label}
                      {sort === key && <Check className="size-3.5 text-[#0075de]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <span className="text-[12px] text-muted-foreground pl-1">
              <span className="font-medium text-foreground">{doneTasks}</span>/{totalTasks} done
            </span>
          </div>
        </div>

        {/* AI error banner */}
        {aiError && (
          <div className="flex items-center justify-between px-5 py-2 bg-red-500/8 border-b border-red-500/15 text-[12px] text-red-500">
            <span>{aiError}</span>
            <button onClick={() => setAiError(null)} className="shrink-0 hover:opacity-70 active:scale-[0.90]" style={{ transition: 'opacity 120ms ease-out, transform 100ms ease-out' }}>
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Table header ── */}
      <div className="grid items-center border-b border-border bg-muted/20 shrink-0 text-[11px] font-medium text-muted-foreground/60"
           style={{ gridTemplateColumns: COLS }}>
        <div className="px-2 py-2 text-center">#</div>
        <div className="px-3 py-2">Task name</div>
        <div className="px-3 py-2">Assignee</div>
        <div className="px-3 py-2">Due date</div>
        <div className="px-3 py-2">Priority</div>
        <div className="px-3 py-2 text-right">Min</div>
        <div />
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {data.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            editable={editable}
            hideCompleted={hideCompleted}
            sort={sort}
            currentUser={currentUser}
            onToggleCollapse={() => toggleCollapse(section.id)}
            onRenameSection={(title) => renameSectionInline(section.id, title)}
            onAddTask={() => addTask(section.id)}
            onUpdateTask={(taskId, patch) => updateTask(section.id, taskId, patch)}
            onDeleteTask={(taskId) => deleteTask(section.id, taskId)}
            onCyclePriority={(taskId) => {
              const task = section.tasks.find(t => t.id === taskId)
              if (task) updateTask(section.id, taskId, { priority: cyclePriority(task.priority) })
            }}
          />
        ))}

        {/* Add section */}
        {editable && (
          <div className="px-5 py-3">
            {editingSection === 'new' ? (
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') { setEditingSection(null); setNewSectionTitle('') } }}
                  onBlur={() => { if (!newSectionTitle.trim()) setEditingSection(null) }}
                  placeholder="Section name…"
                  className="text-[13px] px-3 py-1.5 rounded-lg border border-[#0075de]/30 bg-background focus:outline-none focus:ring-2 focus:ring-[#097fe8]/30 w-56"
                />
                <button onClick={addSection} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#0075de] text-white font-medium hover:bg-[#0075de] active:scale-[0.97]" style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}>Add</button>
                <button onClick={() => setEditingSection(null)} className="text-[12px] text-muted-foreground hover:text-foreground active:opacity-70" style={{ transition: 'color 120ms ease-out, opacity 100ms ease-out' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditingSection('new')} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground active:opacity-70" style={{ transition: 'color 120ms ease-out, opacity 100ms ease-out' }}>
                <Plus className="size-3.5" />Add section
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section Block ────────────────────────────────────────────────────────────

interface SectionBlockProps {
  section: AgendaSection
  editable: boolean
  hideCompleted: boolean
  sort: SortKey
  currentUser: CurrentUser
  onToggleCollapse: () => void
  onRenameSection: (title: string) => void
  onAddTask: () => void
  onUpdateTask: (taskId: string, patch: Partial<AgendaTask>) => void
  onDeleteTask: (taskId: string) => void
  onCyclePriority: (taskId: string) => void
}

function SectionBlock({ section, editable, hideCompleted, sort, currentUser, onToggleCollapse, onRenameSection, onAddTask, onUpdateTask, onDeleteTask, onCyclePriority }: SectionBlockProps) {
  const [renamingSection, setRenamingSection] = useState(false)
  const [sectionTitle, setSectionTitle] = useState(section.title)

  const visibleTasks = sortTasks(
    hideCompleted ? section.tasks.filter(t => !t.completed) : section.tasks,
    sort
  )
  const minutesSum = section.tasks.reduce((a, t) => a + (t.minutes ?? 0), 0)

  let rowNum = 0

  return (
    <div className="border-b border-border">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/10">
        <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground shrink-0 active:scale-[0.85]" style={{ transition: 'color 120ms ease-out, transform 100ms cubic-bezier(0.23,1,0.32,1)' }}>
          <ChevronRight
            className="size-3.5"
            style={{ transform: section.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)' }}
          />
        </button>
        {renamingSection ? (
          <input
            autoFocus
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            onBlur={() => { onRenameSection(sectionTitle); setRenamingSection(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { onRenameSection(sectionTitle); setRenamingSection(false) } }}
            className="text-[14px] font-bold text-foreground bg-transparent border-b border-[#0075de] focus:outline-none"
          />
        ) : (
          <button onDoubleClick={() => editable && setRenamingSection(true)} className="text-[14px] font-bold text-foreground tracking-tight text-left">
            {section.title}
          </button>
        )}
        <span className="text-[12px] text-muted-foreground/50 ml-0.5">{section.tasks.length}</span>
      </div>

      {/* Task rows */}
      {!section.collapsed && (
        <>
          {visibleTasks.length === 0 ? (
            <div className="px-10 py-3 text-[13px] text-muted-foreground/40 italic">No tasks yet</div>
          ) : (
            visibleTasks.map((task) => {
              rowNum++
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  rowNum={rowNum}
                  editable={editable}
                  currentUser={currentUser}
                  onToggleComplete={() => onUpdateTask(task.id, { completed: !task.completed })}
                  onUpdateText={(text) => onUpdateTask(task.id, { text })}
                  onUpdateAssignee={(assignee, assigneeEmail) => onUpdateTask(task.id, { assignee, assigneeEmail })}
                  onUpdateDueDate={(dueDate) => onUpdateTask(task.id, { dueDate })}
                  onUpdateMinutes={(minutes) => onUpdateTask(task.id, { minutes })}
                  onCyclePriority={() => onCyclePriority(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                />
              )
            })
          )}

          {/* Minutes SUM row */}
          {minutesSum > 0 && (
            <div className="grid items-center text-[12px] text-muted-foreground py-1.5 border-t border-border/40"
                 style={{ gridTemplateColumns: COLS }}>
              <div /><div /><div /><div /><div />
              <div className="px-3 text-right font-semibold text-foreground">
                <span className="text-[10px] text-muted-foreground mr-1">SUM</span>{minutesSum}
              </div>
              <div />
            </div>
          )}

          {editable && (
            <button
              onClick={onAddTask}
              className="w-full flex items-center gap-2 px-10 py-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/20 text-left active:opacity-70"
              style={{ transition: 'color 120ms ease-out, background-color 120ms ease-out, opacity 100ms ease-out' }}
            >
              <Plus className="size-3.5" />Add task…
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

type ActiveCell = 'text' | 'assignee' | 'dueDate' | 'minutes' | null

interface TaskRowProps {
  task: AgendaTask
  rowNum: number
  editable: boolean
  currentUser: CurrentUser
  onToggleComplete: () => void
  onUpdateText: (text: string) => void
  onUpdateAssignee: (name: string | null, email: string | null) => void
  onUpdateDueDate: (date: string | null) => void
  onUpdateMinutes: (min: number | null) => void
  onCyclePriority: () => void
  onDelete: () => void
}

function TaskRow({ task, rowNum, editable, currentUser, onToggleComplete, onUpdateText, onUpdateAssignee, onUpdateDueDate, onUpdateMinutes, onCyclePriority, onDelete }: TaskRowProps) {
  const [hovered, setHovered] = useState(false)
  const [activeCell, setActiveCell] = useState<ActiveCell>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const minutesInputRef = useRef<HTMLInputElement>(null)
  const [assigneeInput, setAssigneeInput] = useState(task.assignee ?? '')
  const assigneeRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (activeCell === 'text') textInputRef.current?.focus() }, [activeCell])
  useEffect(() => { if (activeCell === 'minutes') minutesInputRef.current?.focus() }, [activeCell])

  // Close assignee dropdown on outside click
  useEffect(() => {
    if (activeCell !== 'assignee') return
    function handle(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setActiveCell(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [activeCell])

  function commitAssignee(name: string, email: string | null) {
    onUpdateAssignee(name || null, email)
    setActiveCell(null)
  }
  function clearAssignee() { onUpdateAssignee(null, null); setAssigneeInput(''); setActiveCell(null) }

  const isCompleted = task.completed

  return (
    <div
      className={`grid items-center border-b border-border/40 ${isCompleted ? 'opacity-50' : ''} ${hovered && !isCompleted ? 'bg-muted/20' : ''}`}
      style={{ gridTemplateColumns: COLS, transition: 'opacity 150ms ease-out, background-color 120ms ease-out' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row # */}
      <div className="text-center text-[11px] text-muted-foreground/30 py-2.5 select-none">{rowNum}</div>

      {/* Checkbox + text */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 min-w-0">
        <button
          onClick={onToggleComplete}
          className={`shrink-0 size-[18px] rounded-full border-2 flex items-center justify-center active:scale-[0.82] ${isCompleted ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted-foreground/30 hover:border-[#0075de]'}`}
          style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), border-color 150ms ease-out, background-color 150ms ease-out' }}
        >
          {isCompleted && <div className="size-2 rounded-full bg-emerald-500" />}
        </button>

        {activeCell === 'text' && editable ? (
          <input
            ref={textInputRef}
            value={task.text}
            onChange={(e) => onUpdateText(e.target.value)}
            onBlur={() => setActiveCell(null)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setActiveCell(null) }}
            placeholder="Task name…"
            className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
          />
        ) : (
          <span
            onClick={editable ? () => setActiveCell('text') : undefined}
            className={`text-[13px] flex-1 min-w-0 truncate ${isCompleted ? 'line-through' : 'text-foreground'} ${editable ? 'cursor-text' : ''}`}
          >
            {task.text || <span className="text-muted-foreground/30 italic text-[12px]">Untitled task</span>}
          </span>
        )}
      </div>

      {/* Assignee */}
      <div className="px-3 py-2 relative" ref={assigneeRef}>
        {activeCell === 'assignee' && editable ? (
          <div className="animate-popup absolute left-2 top-0 z-50 w-52 rounded-xl border border-border bg-popover shadow-xl overflow-hidden" style={{ top: '100%', marginTop: 2 }}>
            {/* Current user quick-assign */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] text-muted-foreground/60 font-medium mb-1.5">Quick assign</p>
              <button
                onClick={() => commitAssignee(currentUser.name, currentUser.email)}
                className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/60 text-left"
                style={{ transition: 'background-color 120ms ease-out' }}
              >
                <Avatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size={22} />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
                </div>
                {task.assignee === currentUser.name && <Check className="size-3 text-[#0075de] shrink-0 ml-auto" />}
              </button>
            </div>
            {/* Manual input */}
            <div className="px-3 py-2">
              <p className="text-[10px] text-muted-foreground/60 font-medium mb-1.5">Custom name</p>
              <input
                autoFocus={task.assignee !== currentUser.name}
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitAssignee(assigneeInput, null); if (e.key === 'Escape') setActiveCell(null) }}
                placeholder="Type a name…"
                className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#097fe8]/30"
              />
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => commitAssignee(assigneeInput, null)} className="flex-1 text-[11px] py-1 rounded-lg bg-[#0075de] text-white font-medium hover:bg-[#0075de]" style={{ transition: 'background-color 120ms ease-out' }}>
                  Assign
                </button>
                {task.assignee && (
                  <button onClick={clearAssignee} className="px-2 py-1 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-red-500 hover:border-red-300" style={{ transition: 'color 120ms ease-out, border-color 120ms ease-out' }}>
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {task.assignee ? (
          <button
            onClick={editable ? () => { setAssigneeInput(task.assignee ?? ''); setActiveCell('assignee') } : undefined}
            className="flex items-center gap-1.5 max-w-full"
          >
            <Avatar name={task.assignee} size={20} />
            <span className="text-[12px] text-foreground/80 truncate">{task.assignee}</span>
            {task.assigneeEmail && <span className="text-[10px] text-muted-foreground/60 truncate hidden xl:block">{task.assigneeEmail}</span>}
          </button>
        ) : (
          editable ? (
            <button
              onClick={() => { setAssigneeInput(''); setActiveCell('assignee') }}
              className={`flex items-center gap-1 text-[12px] text-muted-foreground/40 hover:text-muted-foreground ${hovered ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 120ms ease-out, color 120ms ease-out' }}
            >
              <User className="size-3" />
              <span>Assign</span>
            </button>
          ) : null
        )}
      </div>

      {/* Due date */}
      <div className="px-3 py-2.5">
        {activeCell === 'dueDate' && editable ? (
          <input
            autoFocus
            type="date"
            value={task.dueDate ?? ''}
            onChange={(e) => { onUpdateDueDate(e.target.value || null); setActiveCell(null) }}
            onBlur={() => setActiveCell(null)}
            className="text-[12px] bg-background border border-[#0075de]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#097fe8]/30"
          />
        ) : task.dueDate ? (
          <button
            onClick={editable ? () => setActiveCell('dueDate') : undefined}
            className="text-[12px] text-muted-foreground hover:text-foreground"
            style={{ transition: 'color 120ms ease-out' }}
          >
            {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
        ) : editable ? (
          <button
            onClick={() => setActiveCell('dueDate')}
            className={`text-[12px] text-muted-foreground/40 hover:text-muted-foreground ${hovered ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'opacity 120ms ease-out, color 120ms ease-out' }}
          >
            Add date
          </button>
        ) : null}
      </div>

      {/* Priority */}
      <div className="px-3 py-2.5">
        {task.priority ? (
          <button
            onClick={editable ? onCyclePriority : undefined}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${PRIORITY_STYLE[task.priority]} active:scale-[0.96]`}
            style={{ transition: 'transform 100ms ease-out' }}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </button>
        ) : editable ? (
          <button
            onClick={onCyclePriority}
            className={`text-[12px] text-muted-foreground/40 hover:text-muted-foreground ${hovered ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'opacity 120ms ease-out, color 120ms ease-out' }}
          >
            + Priority
          </button>
        ) : null}
      </div>

      {/* Minutes */}
      <div className="px-3 py-2.5 text-right">
        {activeCell === 'minutes' && editable ? (
          <input
            ref={minutesInputRef}
            type="number"
            min={0}
            value={task.minutes ?? ''}
            onChange={(e) => onUpdateMinutes(e.target.value ? Number(e.target.value) : null)}
            onBlur={() => setActiveCell(null)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setActiveCell(null) }}
            className="w-14 text-[12px] text-right bg-background border border-[#0075de]/30 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#097fe8]/30"
          />
        ) : (
          <button
            onClick={editable ? () => setActiveCell('minutes') : undefined}
            className={`text-[12px] font-medium ${task.minutes ? 'text-foreground' : `text-muted-foreground/40 hover:text-muted-foreground ${hovered ? 'opacity-100' : 'opacity-0'}`}`}
            style={{ transition: 'opacity 120ms ease-out, color 120ms ease-out' }}
          >
            {task.minutes ?? (hovered ? '-' : '')}
          </button>
        )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-center py-2.5">
        {editable && hovered && (
          <button onClick={onDelete} className="text-muted-foreground/30 hover:text-red-400 active:scale-[0.80]" style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 120ms ease-out' }}>
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

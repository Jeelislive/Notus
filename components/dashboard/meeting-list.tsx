'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Mic,
  FileText,
  ChevronUp,
  ChevronDown,
  Search,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@/lib/db/schema'

const MEETING_TYPE_LABELS: Record<NonNullable<Meeting['meetingType']>, string> = {
  one_on_one:   '1-on-1',
  team_meeting: 'Team Meeting',
  standup:      'Daily Standup',
  interview:    'Interview',
  client:       'Sales Call',
  other:        'General',
}

function TypeBadge({ templateName, meetingType }: { templateName: Meeting['templateName']; meetingType: Meeting['meetingType'] }) {
  const label = templateName || MEETING_TYPE_LABELS[meetingType ?? 'other']
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border border-border bg-muted/60 text-muted-foreground whitespace-nowrap">
      {label}
    </span>
  )
}
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteMeeting, renameMeeting, deleteAllMeetings } from '@/app/actions/meetings'
import { formatDuration, formatDate } from '@/lib/utils'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface MeetingListProps {
  meetings: Meeting[]
}

type SortCol = 'name' | 'date' | 'duration' | 'status' | 'type'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | 'completed' | 'in-progress'

// ─────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Meeting['status'] }) {
  const configs: Record<
    Meeting['status'],
    { label: string; dotClass: string; badgeClass: string; pulse?: boolean }
  > = {
    pending: {
      label: 'Draft',
      dotClass: 'bg-zinc-400',
      badgeClass: 'border-zinc-500/20 bg-zinc-500/8 text-zinc-400',
    },
    recording: {
      label: 'Recording',
      dotClass: 'bg-red-400',
      badgeClass: 'border-red-500/20 bg-red-500/8 text-red-400',
      pulse: true,
    },
    processing: {
      label: 'Processing',
      dotClass: 'bg-amber-400',
      badgeClass: 'border-amber-500/20 bg-amber-500/8 text-amber-400',
    },
    completed: {
      label: 'Done',
      dotClass: 'bg-emerald-500',
      badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    failed: {
      label: 'Failed',
      dotClass: 'bg-red-400',
      badgeClass: 'border-red-500/20 bg-red-500/8 text-red-400',
    },
  }

  const cfg = configs[status] ?? configs.pending

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border ${cfg.badgeClass}`}
    >
      <span
        className={`size-1.5 rounded-full shrink-0 ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse' : ''}`}
      />
      {cfg.label}
    </span>
  )
}

function StatusDot({ status }: { status: Meeting['status'] }) {
  const dotClass: Record<Meeting['status'], string> = {
    completed: 'bg-emerald-300',
    recording: 'bg-red-400 animate-pulse',
    processing: 'bg-amber-400',
    pending: 'bg-zinc-500',
    failed: 'bg-red-400',
  }
  return (
    <span
      className={`size-2 rounded-full shrink-0 ${dotClass[status] ?? 'bg-zinc-500'}`}
    />
  )
}

// ─────────────────────────────────────────────────────────
// Mobile card — tap to open detail popup
// ─────────────────────────────────────────────────────────

function MobileMeetingCard({ meeting, index }: { meeting: Meeting; index: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(meeting.title)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleRename() {
    setRenaming(true)
    await renameMeeting(meeting.id, renameValue)
    setRenaming(false)
    setRenameOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${meeting.title}"? This cannot be undone.`)) return
    setOpen(false)
    setDeleting(true)
    await deleteMeeting(meeting.id)
  }

  return (
    <>
      {/* List row — name only */}
      <button
        onClick={() => setOpen(true)}
        disabled={deleting}
        className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border text-left active:bg-muted/60 animate-meeting-row ${
          deleting ? 'opacity-40 pointer-events-none' : ''
        }`}
        style={{ animationDelay: `${index * 30}ms`, transition: 'background-color 120ms ease-out' }}
      >
        <StatusDot status={meeting.status} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate leading-snug">{meeting.title}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(meeting.createdAt)}</p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground/40 shrink-0" />
      </button>

      {/* Detail popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-left pr-6 leading-snug">{meeting.title}</DialogTitle>
          </DialogHeader>

          {/* Status + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={meeting.status} />
            <TypeBadge templateName={meeting.templateName} meetingType={meeting.meetingType} />
          </div>

          {/* Meta info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              <span>{formatDate(meeting.createdAt)}</span>
            </div>
            {(meeting.durationSeconds ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                <span className="font-mono tabular-nums">{formatDuration(meeting.durationSeconds ?? 0)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={() => { setOpen(false); router.push(`/dashboard/meetings/${meeting.id}`) }}
              className="w-full"
            >
              Open meeting
              <ArrowRight className="size-4" />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setOpen(false); setTimeout(() => setRenameOpen(true), 150) }}
              >
                <Pencil className="size-3.5" />
                Rename
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Meeting title"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
                {renaming ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Sort helper
// ─────────────────────────────────────────────────────────

function sortMeetings(meetings: Meeting[], col: SortCol, dir: SortDir): Meeting[] {
  return [...meetings].sort((a, b) => {
    let cmp = 0
    if (col === 'name') {
      cmp = a.title.localeCompare(b.title)
    } else if (col === 'date') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (col === 'duration') {
      cmp = (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0)
    } else if (col === 'status') {
      const order: Record<Meeting['status'], number> = {
        recording: 0,
        processing: 1,
        pending: 2,
        completed: 3,
        failed: 4,
      }
      cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5)
    } else if (col === 'type') {
      cmp = (a.meetingType ?? 'other').localeCompare(b.meetingType ?? 'other')
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─────────────────────────────────────────────────────────
// Column header with sort
// ─────────────────────────────────────────────────────────

function ColHeader({
  label,
  col,
  active,
  dir,
  onSort,
  className,
}: {
  label: string
  col: SortCol
  active: boolean
  dir: SortDir
  onSort: (col: SortCol) => void
  className?: string
}) {
  return (
    <th
      className={`text-left py-3 px-5 ${className ?? ''}`}
      style={{ userSelect: 'none' }}
    >
      <button
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        style={{ transition: 'color 120ms ease-out' }}
      >
        {label}
        <span className="flex flex-col ml-0.5">
          <ChevronUp
            className={`size-2.5 -mb-0.5 ${active && dir === 'asc' ? 'text-foreground' : 'text-muted-foreground/40'}`}
          />
          <ChevronDown
            className={`size-2.5 ${active && dir === 'desc' ? 'text-foreground' : 'text-muted-foreground/40'}`}
          />
        </span>
      </button>
    </th>
  )
}

// ─────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────

function MeetingRow({ meeting, index }: { meeting: Meeting; index: number }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(meeting.title)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleRename() {
    setRenaming(true)
    await renameMeeting(meeting.id, renameValue)
    setRenaming(false)
    setRenameOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${meeting.title}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteMeeting(meeting.id)
  }

  return (
    <>
      <tr
        className={`group border-b border-border animate-meeting-row ${
          deleting ? 'opacity-40 pointer-events-none' : 'hover:bg-muted/40'
        }`}
        style={{
          animationDelay: `${index * 30}ms`,
          transition: 'background-color 120ms ease-out',
        }}
      >
        {/* NAME */}
        <td className="py-3.5 px-5">
          <Link
            href={`/dashboard/meetings/${meeting.id}`}
            className="inline-flex items-center gap-2.5 min-w-0 max-w-full active:opacity-70"
            style={{ transition: 'opacity 120ms ease-out' }}
          >
            <StatusDot status={meeting.status} />
            <span className="text-[15px] font-semibold text-foreground truncate leading-snug">
              {meeting.title}
            </span>
          </Link>
        </td>

        {/* DATE */}
        <td className="py-3.5 px-5 w-52">
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {formatDate(meeting.createdAt)}
          </span>
        </td>

        {/* DURATION */}
        <td className="py-3.5 px-5 w-40">
          <span className="text-[13px] text-muted-foreground font-mono tabular-nums">
            {(meeting.durationSeconds ?? 0) > 0
              ? formatDuration(meeting.durationSeconds ?? 0)
              : '—'}
          </span>
        </td>

        {/* TYPE */}
        <td className="py-3.5 px-5 w-44">
          <TypeBadge templateName={meeting.templateName} meetingType={meeting.meetingType} />
        </td>

        {/* STATUS */}
        <td className="py-3.5 px-5 w-44">
          <StatusBadge status={meeting.status} />
        </td>

        {/* ACTIONS */}
        <td className="py-3.5 px-5 w-12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 active:scale-[0.87]"
                style={{
                  transition:
                    'transform 100ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease-out, background-color 120ms ease-out, color 120ms ease-out',
                }}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={handleDelete}>
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Meeting title"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={renaming || !renameValue.trim()}
              >
                {renaming ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Main table component
// ─────────────────────────────────────────────────────────

export function MeetingTable({ meetings }: MeetingListProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: 'date',
    dir: 'desc',
  })
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    )
  }

  const filtered = useMemo(() => {
    let result = meetings

    // Tab filter
    if (activeTab === 'completed') {
      result = result.filter((m) => m.status === 'completed')
    } else if (activeTab === 'in-progress') {
      result = result.filter(
        (m) => m.status === 'recording' || m.status === 'processing'
      )
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) => m.title.toLowerCase().includes(q))
    }

    return sortMeetings(result, sort.col, sort.dir)
  }, [meetings, activeTab, searchQuery, sort])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'in-progress', label: 'In Progress' },
  ]

  return (
    <div>
      {/* Filter / search bar — sticky so it stays visible while table scrolls */}
      <div className="sticky top-0 z-10 bg-background flex flex-col sm:flex-row sm:items-center gap-0 px-3 sm:px-5 border-b border-border">
        {/* Tabs */}
        <div className="flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3.5 text-[13px] font-medium border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-foreground border-foreground'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
              style={{ transition: 'color 120ms ease-out, border-color 120ms ease-out' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Delete all */}
        <div className="flex items-center gap-2 py-2 sm:ml-auto sm:min-w-0 sm:max-w-sm w-full sm:w-auto">
          <div className="relative flex items-center flex-1">
            <Search
              className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none"
              strokeWidth={2}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter meetings..."
              className="pl-8 pr-3 py-1.5 rounded-md border border-border bg-muted/40 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 w-full"
              style={{ transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out' }}
            />
          </div>
          {meetings.length > 0 && (
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-red-500 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 shrink-0"
              style={{ transition: 'background-color 150ms ease-out, border-color 150ms ease-out' }}
            >
              <Trash2 className="size-3.5" />
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="size-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-5">
            <Mic className="size-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-semibold text-foreground mb-1.5">
            No meetings yet
          </h3>
          <p className="text-[14px] text-muted-foreground max-w-xs leading-relaxed">
            Create your first meeting to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-14 rounded-xl bg-muted/60 border border-border flex items-center justify-center mb-4">
            <FileText className="size-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1">
            No results found
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <>
        {/* ── Mobile list (tap to open popup) ── */}
        <div className="md:hidden">
          {filtered.map((meeting, index) => (
            <MobileMeetingCard key={meeting.id} meeting={meeting} index={index} />
          ))}
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <ColHeader
                label="Name"
                col="name"
                active={sort.col === 'name'}
                dir={sort.dir}
                onSort={handleSort}
              />
              <ColHeader
                label="Date"
                col="date"
                active={sort.col === 'date'}
                dir={sort.dir}
                onSort={handleSort}
                className="w-52"
              />
              <ColHeader
                label="Duration"
                col="duration"
                active={sort.col === 'duration'}
                dir={sort.dir}
                onSort={handleSort}
                className="w-40"
              />
              <ColHeader
                label="Type"
                col="type"
                active={sort.col === 'type'}
                dir={sort.dir}
                onSort={handleSort}
                className="w-44"
              />
              <ColHeader
                label="Status"
                col="status"
                active={sort.col === 'status'}
                dir={sort.dir}
                onSort={handleSort}
                className="w-44"
              />
              {/* Actions — no header label */}
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((meeting, index) => (
              <MeetingRow key={meeting.id} meeting={meeting} index={index} />
            ))}
          </tbody>
        </table>
        </div>
        </>
      )}

      {/* Delete All confirmation dialog */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete all meetings?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            This will permanently delete all <span className="font-semibold text-foreground">{meetings.length}</span> meetings including their transcripts and notes. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingAll}
              onClick={async () => {
                setDeletingAll(true)
                await deleteAllMeetings()
                setDeleteAllOpen(false)
                setDeletingAll(false)
              }}
            >
              {deletingAll ? 'Deleting…' : 'Delete all'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Backwards-compat re-export
// ─────────────────────────────────────────────────────────

export function MeetingList(props: MeetingListProps) {
  return <MeetingTable {...props} />
}

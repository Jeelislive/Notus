'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  MoreHorizontal, Pencil, Trash2, Mic, FileText,
  Search, Clock, Sparkles, Users, ListChecks,
  FolderPlus, Folder as FolderIcon, FolderOpen, ArrowRight,
} from 'lucide-react'
import type { Meeting, Folder } from '@/lib/db/schema'
import { getFolderIcon } from '@/lib/folder-icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteMeeting, renameMeeting } from '@/app/actions/meetings'
import { assignMeetingToFolder } from '@/app/actions/folders'
import { CreateFolderDialog } from '@/components/dashboard/create-folder-dialog'
import { toast } from '@/hooks/use-toast'
import { formatDuration } from '@/lib/utils'


const MEETING_TYPE_LABELS: Record<NonNullable<Meeting['meetingType']>, string> = {
  one_on_one:   '1-on-1',
  team_meeting: 'Team',
  standup:      'Standup',
  interview:    'Interview',
  client:       'Sales Call',
  other:        'General',
}

// ── Date grouping ─────────────────────────────────────────
function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff <= 6) return date.toLocaleDateString('en-US', { weekday: 'long' })
  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function groupMeetingsByDate(meetings: Meeting[]) {
  const groupMap = new Map<string, Meeting[]>()
  for (const m of meetings) {
    const label = getDateLabel(new Date(m.createdAt))
    if (!groupMap.has(label)) groupMap.set(label, [])
    groupMap.get(label)!.push(m)
  }
  return Array.from(groupMap.entries()).map(([label, meetings]) => ({ label, meetings }))
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Meeting icon ──────────────────────────────────────────
function MeetingIcon({ meeting }: { meeting: Meeting }) {
  const type = meeting.meetingType
  const Icon =
    type === 'one_on_one' ? Users :
    type === 'standup' ? ListChecks :
    meeting.status === 'completed' ? Sparkles :
    FileText

  const bgColor =
    meeting.status === 'recording' ? 'bg-red-500/10 text-red-500' :
    meeting.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
    'bg-muted text-muted-foreground'

  return (
    <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>
      <Icon className="size-4" strokeWidth={1.75} />
    </div>
  )
}

function StatusDot({ status }: { status: Meeting['status'] }) {
  const cls: Record<Meeting['status'], string> = {
    completed: 'bg-emerald-400',
    recording: 'bg-red-400 animate-pulse',
    processing: 'bg-amber-400 animate-pulse',
    pending: 'bg-zinc-400',
    failed: 'bg-red-400',
  }
  return <span className={`size-1.5 rounded-full shrink-0 ${cls[status] ?? 'bg-zinc-400'}`} />
}

// ── Meeting row ───────────────────────────────────────────
function MeetingRow({ meeting, folders, index }: { meeting: Meeting; folders: Folder[]; index: number }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(meeting.title)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)

  async function handleRename() {
    setRenaming(true)
    const result = await renameMeeting(meeting.id, renameValue)
    setRenaming(false)
    if (result?.error) toast(result.error, { variant: 'destructive' })
    else { toast('Meeting renamed', { variant: 'success' }); setRenameOpen(false) }
  }

  async function handleDelete() {
    setDeleteOpen(false)
    setDeleting(true)
    const result = await deleteMeeting(meeting.id)
    if (result?.success) toast('Meeting deleted', { variant: 'success' })
  }

  async function handleMoveToFolder(folderId: string | null) {
    await assignMeetingToFolder(meeting.id, folderId)
    toast(folderId ? 'Added to folder' : 'Removed from folder', { variant: 'success' })
  }

  const typeLabel = meeting.templateName || MEETING_TYPE_LABELS[meeting.meetingType ?? 'other']
  const time = formatTime(new Date(meeting.createdAt))
  const duration = (meeting.durationSeconds ?? 0) > 0 ? formatDuration(meeting.durationSeconds ?? 0) : null

  return (
    <>
      <div
        className={`group flex items-center gap-3.5 px-6 py-3 hover:bg-muted/30 transition-colors animate-meeting-row ${deleting ? 'opacity-40 pointer-events-none' : ''}`}
        style={{ animationDelay: `${index * 25}ms` }}
      >
        <MeetingIcon meeting={meeting} />

        <Link href={`/dashboard/notes?meeting=${meeting.id}`} className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot status={meeting.status} />
              <p className="text-[14.5px] font-medium text-foreground truncate leading-snug">{meeting.title}</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5 ml-3.5">
              <span className="text-[11.5px] text-muted-foreground/70">{time}</span>
              {duration && (
                <>
                  <span className="text-[11px] text-muted-foreground/30">·</span>
                  <span className="text-[11.5px] text-muted-foreground/70 flex items-center gap-1">
                    <Clock className="size-2.5" />{duration}
                  </span>
                </>
              )}
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[11.5px] text-muted-foreground/60">{typeLabel}</span>
              {meeting.folderId && (() => {
                const f = folders.find((x) => x.id === meeting.folderId)
                return f ? (
                  <>
                    <span className="text-[11px] text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                      <FolderIcon className="size-2.5" />{f.name}
                    </span>
                  </>
                ) : null
              })()}
            </div>
          </div>
        </Link>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="size-3.5" />Rename
              </DropdownMenuItem>

              {folders.length > 0 && (
                <DropdownMenuItem onClick={() => setFolderPickerOpen(true)}>
                  <FolderIcon className="size-3.5" />Add to folder
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete meeting?</DialogTitle></DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            This will permanently delete &quot;{meeting.title}&quot; and all its notes. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder picker */}
      <Dialog open={folderPickerOpen} onOpenChange={setFolderPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add to folder</DialogTitle></DialogHeader>
          <div className="space-y-1.5 pt-1">
            {meeting.folderId && (
              <button
                onClick={() => { handleMoveToFolder(null); setFolderPickerOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-red-500 hover:bg-red-500/5 transition-colors text-left"
              >
                <FolderOpen className="size-4" />Remove from folder
              </button>
            )}
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { handleMoveToFolder(f.id); setFolderPickerOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors text-left ${meeting.folderId === f.id ? 'bg-muted/50' : ''}`}
              >
                <span className="text-[18px]">{f.icon}</span>{f.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Meeting title" onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
                {renaming ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Folder card ───────────────────────────────────────────
function FolderCard({ folder }: { folder: Folder }) {
  return (
    <Link
      href={`/dashboard/folder/${folder.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-background dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20 hover:border-foreground/20 transition-all shadow-sm"
    >
      {(() => { const Icon = getFolderIcon(folder.icon); return (
        <div className="size-10 rounded-xl bg-muted/60 dark:bg-muted/30 flex items-center justify-center shrink-0">
          <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
      ) })()}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-foreground truncate">{folder.name}</p>
        {folder.description && (
          <p className="text-[11.5px] text-muted-foreground/80 truncate mt-0.5">{folder.description}</p>
        )}
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0" />
    </Link>
  )
}

// ── Main component ────────────────────────────────────────
export function MeetingTable({ meetings, folders }: { meetings: Meeting[]; folders: Folder[] }) {
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const filtered = meetings

  const groups = groupMeetingsByDate(filtered)

  return (
    <div>
      <div className="pb-8">
        {/* Folders section */}
        {folders.length > 0 && (
          <div>
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <p className="text-[11.5px] font-bold text-foreground/60 uppercase tracking-[0.1em]">Folders</p>
              <button
                onClick={() => setCreateFolderOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <FolderPlus className="size-3.5" />
                New folder
              </button>
            </div>
            <div className="px-6 grid grid-cols-2 gap-2.5 pb-2">
              {folders.map((f) => <FolderCard key={f.id} folder={f} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="size-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
              <Mic className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-foreground mb-1">No meetings yet</p>
            <p className="text-[13px] text-muted-foreground max-w-xs">Your meetings will appear here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center mb-3">
              <Search className="size-5 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-foreground">No results</p>
            <p className="text-[12px] text-muted-foreground mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            {/* "New folder" prompt if no folders yet */}
            {folders.length === 0 && (
              <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <p className="text-[11.5px] font-bold text-foreground/60 uppercase tracking-[0.1em]">Meetings</p>
                <button
                  onClick={() => setCreateFolderOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <FolderPlus className="size-3.5" />
                  New folder
                </button>
              </div>
            )}

            {groups.map(({ label, meetings: groupMeetings }, gi) => {
              let rowIndex = 0
              for (let i = 0; i < gi; i++) rowIndex += groups[i].meetings.length
              return (
                <div key={label}>
                  <div className={`px-6 pb-2 ${gi === 0 && folders.length > 0 ? 'pt-5' : gi === 0 ? 'pt-6' : 'pt-6'}`}>
                    <p className="text-[11.5px] font-bold text-foreground/50 uppercase tracking-[0.1em]">{label}</p>
                  </div>
                  {groupMeetings.map((m, i) => (
                    <MeetingRow key={m.id} meeting={m} folders={folders} index={rowIndex + i} />
                  ))}
                </div>
              )
            })}
          </>
        )}
      </div>

      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} />
    </div>
  )
}

export function MeetingList(props: { meetings: Meeting[] }) {
  return <MeetingTable meetings={props.meetings} folders={[]} />
}

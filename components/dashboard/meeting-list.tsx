'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Mic, Clock } from 'lucide-react'
import type { Meeting } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
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
import { deleteMeeting, renameMeeting } from '@/app/actions/meetings'
import { formatDuration, formatDate } from '@/lib/utils'

const statusConfig = {
  pending: { label: 'Draft', variant: 'pending' as const },
  recording: { label: 'Recording', variant: 'recording' as const },
  processing: { label: 'Processing', variant: 'processing' as const },
  completed: { label: 'Done', variant: 'completed' as const },
  failed: { label: 'Failed', variant: 'failed' as const },
}

interface MeetingListProps {
  meetings: Meeting[]
}

export function MeetingList({ meetings }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Mic className="size-6 text-zinc-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-zinc-300 mb-1">No meetings yet</h3>
        <p className="text-sm text-zinc-600 max-w-xs">
          Create your first meeting to get started. Recording will be available in the next phase.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {meetings.map((meeting) => (
        <MeetingRow key={meeting.id} meeting={meeting} />
      ))}
    </div>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(meeting.title)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = statusConfig[meeting.status]

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
      <div className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 transition-all ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Status dot */}
        <div className="shrink-0">
          {meeting.status === 'recording' ? (
            <span className="size-2 rounded-full bg-red-400 block animate-pulse" />
          ) : meeting.status === 'processing' ? (
            <span className="size-2 rounded-full bg-amber-400 block" />
          ) : meeting.status === 'completed' ? (
            <span className="size-2 rounded-full bg-emerald-500 block" />
          ) : (
            <span className="size-2 rounded-full bg-zinc-700 block" />
          )}
        </div>

        {/* Title + meta */}
        <Link href={`/dashboard/meetings/${meeting.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
              {meeting.title}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span>{formatDate(meeting.createdAt)}</span>
            {(meeting.durationSeconds ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(meeting.durationSeconds ?? 0)}
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100">
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
      </div>

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

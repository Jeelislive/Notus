'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, MoreHorizontal, Clock, Calendar } from 'lucide-react'
import type { Meeting } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteMeeting, renameMeeting } from '@/app/actions/meetings'
import { formatDate, formatDuration } from '@/lib/utils'

const statusConfig = {
  pending: { label: 'Draft', variant: 'pending' as const },
  recording: { label: 'Recording', variant: 'recording' as const },
  processing: { label: 'Processing', variant: 'processing' as const },
  completed: { label: 'Done', variant: 'completed' as const },
  failed: { label: 'Failed', variant: 'failed' as const },
}

export function MeetingDetailHeader({ meeting }: { meeting: Meeting }) {
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
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
      >
        <ArrowLeft className="size-3.5" />
        All meetings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-100 truncate">{meeting.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3" />
              {formatDate(meeting.createdAt)}
            </span>
            {(meeting.durationSeconds ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3" />
                {formatDuration(meeting.durationSeconds ?? 0)}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" disabled={deleting}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={handleDelete}>
              <Trash2 className="size-3.5" />
              Delete meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
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

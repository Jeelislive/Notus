'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, MoreHorizontal, Clock, Calendar, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
import { pushMeetingToSlack, exportMeetingToNotion } from '@/app/actions/integrations'
import { formatDate, formatDuration } from '@/lib/utils'
import { SharePanel } from '@/components/dashboard/share-panel'

// Slack brand color SVG path
const SLACK_PATH =
  'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z'

const NOTION_PATH =
  'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z'

const JIRA_PATH =
  'M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z'

const LINEAR_PATH =
  'M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z'

interface IntegrationActionState {
  loading: boolean
  success: boolean
  error: string | null
}

const DEFAULT_ACTION_STATE: IntegrationActionState = { loading: false, success: false, error: null }

const statusConfig = {
  pending: { label: 'Draft', variant: 'pending' as const },
  recording: { label: 'Recording', variant: 'recording' as const },
  processing: { label: 'Processing', variant: 'processing' as const },
  completed: { label: 'Done', variant: 'completed' as const },
  failed: { label: 'Failed', variant: 'failed' as const },
}

interface MeetingDetailHeaderProps {
  meeting: Meeting & { shareToken?: string | null }
  connectedIntegrations?: string[]
}

export function MeetingDetailHeader({ meeting, connectedIntegrations = [] }: MeetingDetailHeaderProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(meeting.title)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slackState, setSlackState] = useState<IntegrationActionState>(DEFAULT_ACTION_STATE)
  const [notionState, setNotionState] = useState<IntegrationActionState>(DEFAULT_ACTION_STATE)
  const status = statusConfig[meeting.status]

  async function handleShareToSlack() {
    setSlackState({ loading: true, success: false, error: null })
    const result = await pushMeetingToSlack(meeting.id)
    if ('ok' in result && result.ok) {
      setSlackState({ loading: false, success: true, error: null })
      setTimeout(() => setSlackState(DEFAULT_ACTION_STATE), 3000)
    } else {
      setSlackState({ loading: false, success: false, error: 'error' in result ? result.error ?? 'Failed' : 'Failed' })
      setTimeout(() => setSlackState(DEFAULT_ACTION_STATE), 3000)
    }
  }

  async function handleExportToNotion() {
    setNotionState({ loading: true, success: false, error: null })
    const result = await exportMeetingToNotion(meeting.id)
    if ('ok' in result && result.ok) {
      setNotionState({ loading: false, success: true, error: null })
      setTimeout(() => setNotionState(DEFAULT_ACTION_STATE), 3000)
    } else {
      setNotionState({ loading: false, success: false, error: 'error' in result ? result.error ?? 'Failed' : 'Failed' })
      setTimeout(() => setNotionState(DEFAULT_ACTION_STATE), 3000)
    }
  }

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
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground active:scale-[0.96] transition-colors mb-2"
        style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), color 120ms ease-out' }}
      >
        <ArrowLeft className="size-3.5" />
        All meetings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{meeting.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Integration quick-actions — only shown when meeting is completed */}
          {meeting.status === 'completed' && connectedIntegrations.includes('slack') && (
            <button
              onClick={handleShareToSlack}
              disabled={slackState.loading}
              title="Share to Slack"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted active:scale-[0.96] transition-all disabled:opacity-60"
            >
              {slackState.loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : slackState.success ? (
                <CheckCircle2 className="size-3.5 text-green-500" />
              ) : slackState.error ? (
                <XCircle className="size-3.5 text-red-500" />
              ) : (
                <svg role="img" viewBox="0 0 24 24" className="size-3.5" style={{ fill: '#4A154B' }} aria-hidden="true">
                  <path d={SLACK_PATH} />
                </svg>
              )}
              Slack
            </button>
          )}
          {meeting.status === 'completed' && connectedIntegrations.includes('notion') && (
            <button
              onClick={handleExportToNotion}
              disabled={notionState.loading}
              title="Export to Notion"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted active:scale-[0.96] transition-all disabled:opacity-60"
            >
              {notionState.loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : notionState.success ? (
                <CheckCircle2 className="size-3.5 text-green-500" />
              ) : notionState.error ? (
                <XCircle className="size-3.5 text-red-500" />
              ) : (
                <svg role="img" viewBox="0 0 24 24" className="size-3.5" style={{ fill: 'currentColor' }} aria-hidden="true">
                  <path d={NOTION_PATH} />
                </svg>
              )}
              Notion
            </button>
          )}
          {meeting.status === 'completed' && connectedIntegrations.includes('jira') && (
            <Link
              href={`/dashboard/notes?meeting=${meeting.id}`}
              title="Push to Jira"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted active:scale-[0.96] transition-all"
            >
              <svg role="img" viewBox="0 0 24 24" className="size-3.5" style={{ fill: '#0052CC' }} aria-hidden="true">
                <path d={JIRA_PATH} />
              </svg>
              Jira
            </Link>
          )}
          {meeting.status === 'completed' && connectedIntegrations.includes('linear') && (
            <Link
              href={`/dashboard/notes?meeting=${meeting.id}`}
              title="Sync to Linear"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted active:scale-[0.96] transition-all"
            >
              <svg role="img" viewBox="0 0 24 24" className="size-3.5" style={{ fill: '#5E6AD2' }} aria-hidden="true">
                <path d={LINEAR_PATH} />
              </svg>
              Linear
            </Link>
          )}

          <Link
            href={`/dashboard/notes?meeting=${meeting.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted hover:text-foreground active:scale-[0.96]"
            style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, color 120ms ease-out' }}
          >
            <FileText className="size-3.5" />
            Notes
          </Link>
          <SharePanel meetingId={meeting.id} initialToken={meeting.shareToken ?? null} />
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

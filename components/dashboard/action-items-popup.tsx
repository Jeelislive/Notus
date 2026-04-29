'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronRight, Loader2, Zap, ExternalLink, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pushMeetingToJira } from '@/app/actions/integrations'

export interface ActionItemTask {
  text: string
  assignee: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

interface JiraResult {
  key: string
  url: string
  summary: string
}

interface ActionItemsPopupProps {
  items: ActionItemTask[]
  meetingId: string
  meetingTitle: string
  open: boolean
  onClose: () => void
  onCreateInNotus: (items: ActionItemTask[]) => void
  jiraConfig?: JiraConfig | null
}

const PRIORITY_STYLES: Record<ActionItemTask['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export function ActionItemsPopup({
  items,
  meetingId,
  meetingTitle,
  open,
  onClose,
  onCreateInNotus,
  jiraConfig,
}: ActionItemsPopupProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((_, i) => i)))
  const [panel, setPanel] = useState<'list' | 'jira'>('list')

  // Per-task Jira fields
  const [jiraIssueType, setJiraIssueType] = useState<Record<number, string>>({})
  const [jiraAssignee, setJiraAssignee] = useState<Record<number, string>>({})

  // Jira submission state
  const [pushing, setPushing] = useState(false)
  const [jiraResults, setJiraResults] = useState<Record<number, JiraResult>>({})
  const [jiraError, setJiraError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPanel('list')
      setSelected(new Set(items.map((_, i) => i)))
      setJiraResults({})
      setJiraError(null)
    }
  }, [open, items])

  function toggleItem(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleCreateInNotus() {
    const chosen = items.filter((_, i) => selected.has(i))
    onCreateInNotus(chosen)
    onClose()
  }

  async function handlePushToJira() {
    if (!jiraConfig) return
    setPushing(true)
    setJiraError(null)

    const selectedItems = items
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => selected.has(i))

    const issues = selectedItems.map(({ item, i }) => ({
      summary: item.text,
      description: `Action item from meeting: ${meetingTitle}${item.assignee ? `\nAssignee: ${item.assignee}` : ''}${item.deadline ? `\nDue: ${item.deadline}` : ''}`,
      issueType: jiraIssueType[i] ?? 'Task',
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
    }))

    const result = await pushMeetingToJira(meetingId, issues)

    if ('error' in result && result.error) {
      setJiraError(result.error)
    } else if ('created' in result) {
      const results: Record<number, JiraResult> = {}
      selectedItems.forEach(({ i }, idx) => {
        if (result.created?.[idx]) results[i] = result.created[idx]
      })
      setJiraResults(results)
      if (result.errors?.length) {
        setJiraError(`Some issues failed: ${result.errors.join(', ')}`)
      }
    }

    setPushing(false)
  }

  const selectedCount = selected.size

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0 mb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <Zap className="size-4 text-amber-500" />
            Action Items Detected ({items.length})
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            From <span className="font-medium text-foreground">{meetingTitle}</span>
          </p>
        </DialogHeader>

        {/* Panel switcher back button */}
        {panel === 'jira' && (
          <div className="px-6 pt-4 shrink-0">
            <button
              onClick={() => setPanel('list')}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-2"
              style={{ transition: 'color 120ms ease-out' }}
            >
              <ChevronRight className="size-3.5 rotate-180" />
              Back to items
            </button>
          </div>
        )}

        {/* ── Main items list ── */}
        {panel === 'list' && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
            {items.map((item, i) => (
              <label
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 cursor-pointer"
                style={{ transition: 'background-color 120ms ease-out' }}
              >
                <div className="mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleItem(i)}
                    className="sr-only"
                  />
                  <div
                    className={`size-4 rounded border-2 flex items-center justify-center ${
                      selected.has(i)
                        ? 'bg-[#0075de] border-[#0075de]'
                        : 'border-zinc-400 dark:border-zinc-600'
                    }`}
                    style={{ transition: 'background-color 120ms ease-out, border-color 120ms ease-out' }}
                  >
                    {selected.has(i) && <Check className="size-2.5 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[14px] text-foreground leading-snug">{item.text}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.assignee && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f2f9ff] text-[#097fe8] dark:bg-[#0075de]/15 dark:text-[#62aef0]">
                        {item.assignee}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                        {item.deadline}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_STYLES[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* ── Jira panel ── */}
        {panel === 'jira' && (
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5 min-h-0">
            {!jiraConfig ? (
              /* Not connected - direct to settings */
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="size-12 rounded-2xl bg-[#0052CC]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="size-6" style={{ fill: '#0052CC' }} aria-hidden="true">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Jira not connected</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Connect your Jira workspace to push action items directly.
                  </p>
                </div>
                <Link
                  href="/dashboard/integrations"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0052CC] text-white text-[13px] font-medium hover:bg-[#0052CC]/90 transition-colors"
                >
                  <Settings className="size-3.5" />
                  Go to Integrations
                </Link>
              </div>
            ) : (
              /* Connected - show tasks */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">Push to Jira</p>
                    <p className="text-[12px] text-muted-foreground">
                      Project: <span className="font-semibold text-foreground">{jiraConfig.projectKey}</span>
                      {' · '}{jiraConfig.domain}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/integrations"
                    onClick={onClose}
                    className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    style={{ transition: 'color 120ms ease-out' }}
                  >
                    <Settings className="size-3" />
                    Manage
                  </Link>
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => {
                    if (!selected.has(i)) return null
                    const result = jiraResults[i]
                    return (
                      <div key={i} className="p-3 rounded-xl border border-border space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] text-foreground leading-snug flex-1">{item.text}</p>
                          {result && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0 hover:underline"
                            >
                              <Check className="size-3" />
                              {result.key}
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                        {!result && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Assignee email</label>
                              <Input
                                className="h-8 text-[12px]"
                                placeholder={item.assignee || 'user@company.com'}
                                value={jiraAssignee[i] ?? ''}
                                onChange={(e) => setJiraAssignee((p) => ({ ...p, [i]: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Issue type</label>
                              <select
                                value={jiraIssueType[i] ?? 'Task'}
                                onChange={(e) => setJiraIssueType((p) => ({ ...p, [i]: e.target.value }))}
                                className="flex h-8 w-full rounded-lg border border-zinc-700 bg-muted/50 px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-[#097fe8]"
                              >
                                <option value="Task">Task</option>
                                <option value="Bug">Bug</option>
                                <option value="Story">Story</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {jiraError && (
                  <p className="text-[13px] text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{jiraError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Dismiss
          </Button>

          <div className="flex items-center gap-2">
            {panel === 'list' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateInNotus}
                  disabled={selectedCount === 0}
                >
                  Create in Notus
                  {selectedCount > 0 && (
                    <span className="ml-1 text-[11px] opacity-70">({selectedCount})</span>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPanel('jira')}
                  disabled={selectedCount === 0}
                  className="gap-1.5"
                >
                  Push to Jira
                  <ChevronRight className="size-3.5" />
                </Button>
              </>
            )}

            {panel === 'jira' && jiraConfig && (
              <Button
                size="sm"
                onClick={handlePushToJira}
                disabled={pushing || selectedCount === 0 || Object.keys(jiraResults).length === selectedCount}
                className="gap-1.5"
              >
                {pushing ? (
                  <><Loader2 className="size-3.5 animate-spin" />Creating…</>
                ) : Object.keys(jiraResults).length === selectedCount && selectedCount > 0 ? (
                  <><Check className="size-3.5" />Done</>
                ) : (
                  'Create in Jira'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

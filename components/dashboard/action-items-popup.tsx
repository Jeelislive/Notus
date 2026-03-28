'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronRight, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
}

const PRIORITY_STYLES: Record<ActionItemTask['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const JIRA_STORAGE_KEY = 'notus_jira_config'

function loadJiraConfig(): JiraConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(JIRA_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as JiraConfig
  } catch {
    return null
  }
}

export function ActionItemsPopup({
  items,
  meetingId: _meetingId,
  meetingTitle,
  open,
  onClose,
  onCreateInNotus,
}: ActionItemsPopupProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((_, i) => i)))
  const [panel, setPanel] = useState<'list' | 'jira'>('list')

  // Jira connect form
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null)
  const [connectForm, setConnectForm] = useState<JiraConfig>({
    domain: '',
    email: '',
    apiToken: '',
    projectKey: '',
  })

  // Per-task Jira fields
  const [jiraIssueType, setJiraIssueType] = useState<Record<number, string>>({})
  const [jiraAssignee, setJiraAssignee] = useState<Record<number, string>>({})

  // Jira submission state
  const [pushing, setPushing] = useState(false)
  const [jiraResults, setJiraResults] = useState<Record<number, JiraResult>>({})
  const [jiraError, setJiraError] = useState<string | null>(null)

  // Load jira config from localStorage on open
  useEffect(() => {
    if (open) {
      setJiraConfig(loadJiraConfig())
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

  function saveJiraConfig() {
    const cfg = { ...connectForm }
    localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify(cfg))
    setJiraConfig(cfg)
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
      description: `Action item from meeting: ${meetingTitle}${item.assignee ? `\nAssignee: ${item.assignee}` : ''}`,
      assigneeEmail: jiraAssignee[i] ?? item.assignee ?? '',
      dueDate: item.deadline ?? '',
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
      issueType: jiraIssueType[i] ?? 'Task',
    }))

    try {
      const res = await fetch('/api/integrations/jira/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: jiraConfig.domain,
          email: jiraConfig.email,
          apiToken: jiraConfig.apiToken,
          projectKey: jiraConfig.projectKey,
          issues,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create issues')

      const results: Record<number, JiraResult> = {}
      selectedItems.forEach(({ i }, idx) => {
        if (data.created?.[idx]) results[i] = data.created[idx]
      })
      setJiraResults(results)
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setPushing(false)
    }
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

        {/* Panel switcher tabs */}
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
                {/* Checkbox */}
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
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-zinc-400 dark:border-zinc-600'
                    }`}
                    style={{ transition: 'background-color 120ms ease-out, border-color 120ms ease-out' }}
                  >
                    {selected.has(i) && <Check className="size-2.5 text-white" strokeWidth={3} />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[14px] text-foreground leading-snug">{item.text}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.assignee && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {item.assignee}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                        {item.deadline}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_STYLES[item.priority]}`}
                    >
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
              /* Connect form */
              <div className="space-y-4">
                <div>
                  <p className="text-[14px] font-medium text-foreground mb-1">Connect Jira</p>
                  <p className="text-[13px] text-muted-foreground">Enter your Jira workspace details to push action items.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">Domain</label>
                    <Input
                      placeholder="mycompany.atlassian.net"
                      value={connectForm.domain}
                      onChange={(e) => setConnectForm((p) => ({ ...p, domain: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">Email</label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={connectForm.email}
                      onChange={(e) => setConnectForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">API Token</label>
                    <Input
                      type="password"
                      placeholder="ATATT3x…"
                      value={connectForm.apiToken}
                      onChange={(e) => setConnectForm((p) => ({ ...p, apiToken: e.target.value }))}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Generate at{' '}
                      <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                        atlassian.com/manage-profile
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">Project Key</label>
                    <Input
                      placeholder="PROJ"
                      value={connectForm.projectKey}
                      onChange={(e) => setConnectForm((p) => ({ ...p, projectKey: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
                <Button
                  onClick={saveJiraConfig}
                  disabled={!connectForm.domain || !connectForm.email || !connectForm.apiToken || !connectForm.projectKey}
                  className="w-full"
                >
                  Save &amp; Connect Jira
                </Button>
              </div>
            ) : (
              /* Task list for Jira */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">Push to Jira</p>
                    <p className="text-[12px] text-muted-foreground">Project: <span className="font-semibold text-foreground">{jiraConfig.projectKey}</span> · {jiraConfig.domain}</p>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem(JIRA_STORAGE_KEY); setJiraConfig(null) }}
                    className="text-[12px] text-muted-foreground hover:text-red-500"
                    style={{ transition: 'color 120ms ease-out' }}
                  >
                    Disconnect
                  </button>
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
                                className="flex h-8 w-full rounded-lg border border-zinc-700 bg-muted/50 px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  'Apply &amp; Create in Jira'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

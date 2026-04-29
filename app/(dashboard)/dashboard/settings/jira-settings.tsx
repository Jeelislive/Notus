'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface JiraConfig {
  domain: string
  email: string
  apiToken: string
  projectKey: string
}

const JIRA_STORAGE_KEY = 'notus_jira_config'

export function JiraSettings() {
  const [config, setConfig] = useState<JiraConfig | null>(null)
  const [form, setForm] = useState<JiraConfig>({
    domain: '',
    email: '',
    apiToken: '',
    projectKey: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JIRA_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as JiraConfig
        setConfig(parsed)
        setForm(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  function handleSave() {
    localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify(form))
    setConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleDisconnect() {
    localStorage.removeItem(JIRA_STORAGE_KEY)
    setConfig(null)
    setForm({ domain: '', email: '', apiToken: '', projectKey: '' })
  }

  const isFormValid = form.domain.trim() && form.email.trim() && form.apiToken.trim() && form.projectKey.trim()

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Integrations</h2>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-medium text-foreground">Jira</p>
              {config && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="size-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">Connect Jira to push action items automatically</p>
          </div>
          {config && (
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0">
              Disconnect
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1">Domain</label>
              <Input
                placeholder="mycompany.atlassian.net"
                value={form.domain}
                onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1">Project Key</label>
              <Input
                placeholder="PROJ"
                value={form.projectKey}
                onChange={(e) => setForm((p) => ({ ...p, projectKey: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1">Email</label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1">API Token</label>
            <Input
              type="password"
              placeholder="ATATT3x…"
              value={form.apiToken}
              onChange={(e) => setForm((p) => ({ ...p, apiToken: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Generate at{' '}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0075de] hover:underline"
              >
                id.atlassian.com/manage-profile
              </a>
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isFormValid}
          size="sm"
          className="gap-1.5"
        >
          {saved ? (
            <><Check className="size-3.5" />Saved</>
          ) : (
            config ? 'Update Jira Connection' : 'Save Jira Connection'
          )}
        </Button>
      </div>
    </div>
  )
}

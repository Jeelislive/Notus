'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveIntegration, deleteIntegration, testIntegrationConnection } from '@/app/actions/integrations'

interface IntegrationField {
  key: string
  label: string
  placeholder: string
  type: string
  helpText?: string
}

interface IntegrationMeta {
  id: 'jira' | 'slack' | 'notion' | 'linear' | 'github'
  name: string
  description: string
  color: string
  bgColor: string
  category: string
  fields: IntegrationField[]
  siPath: string
}

interface IntegrationSheetProps {
  integration: IntegrationMeta
  isConnected: boolean
  existingConfig?: Record<string, string>
  open: boolean
  onClose: () => void
  onConnected: () => void
  onDisconnected: () => void
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export function IntegrationSheet({
  integration,
  isConnected,
  existingConfig,
  open,
  onClose,
  onConnected,
  onDisconnected,
}: IntegrationSheetProps) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(integration.fields.map((f) => [f.key, existingConfig?.[f.key] ?? '']))
  )
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setForm(Object.fromEntries(integration.fields.map((f) => [f.key, existingConfig?.[f.key] ?? ''])))
      setTestStatus('idle')
      setTestMessage('')
      setConfirmDisconnect(false)
    }
  }, [open, integration, existingConfig])

  async function handleTest() {
    setTestStatus('testing')
    setTestMessage('')
    const result = await testIntegrationConnection(integration.id, form)
    if (result.ok) {
      setTestStatus('success')
      const extra = result.workspaceName ? ` (${result.workspaceName})` : result.teamName ? ` (${result.teamName})` : ''
      setTestMessage(`Connected successfully${extra}`)
    } else {
      setTestStatus('error')
      setTestMessage(result.error ?? 'Connection failed')
    }
  }

  async function handleSave() {
    setSaving(true)
    await saveIntegration(integration.id, form)
    setSaving(false)
    onConnected()
    onClose()
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      return
    }
    setDisconnecting(true)
    await deleteIntegration(integration.id)
    setDisconnecting(false)
    onDisconnected()
    onClose()
  }

  const isFormComplete = integration.fields.every((f) => form[f.key]?.trim())

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } transition-opacity duration-300 ease-out`}
      >
        <div
          className={`w-full max-w-[480px] bg-background border border-border shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 ease-out max-h-[90vh] ${
            open ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${integration.bgColor} flex items-center justify-center shrink-0`}>
              <svg
                role="img"
                viewBox="0 0 24 24"
                className="size-5"
                style={{ fill: integration.color }}
                aria-hidden="true"
              >
                <path d={integration.siPath} />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">{integration.name}</h2>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {integration.category}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[12px] font-semibold">
                <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                Connected
              </span>
            )}
            <button
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <p className="text-[14px] text-muted-foreground">{integration.description}</p>

          {/* Fields */}
          <div className="space-y-3">
            {integration.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[12px] font-medium text-foreground mb-1.5">
                  {field.label}
                </label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="h-9 text-[13px]"
                />
                {field.helpText && (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <ExternalLink className="size-3 shrink-0" />
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Test result */}
          {testStatus !== 'idle' && (
            <div
              className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[13px] ${
                testStatus === 'testing'
                  ? 'bg-muted text-muted-foreground'
                  : testStatus === 'success'
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {testStatus === 'testing' && <Loader2 className="size-4 shrink-0 animate-spin mt-0.5" />}
              {testStatus === 'success' && <CheckCircle2 className="size-4 shrink-0 mt-0.5" />}
              {testStatus === 'error' && <XCircle className="size-4 shrink-0 mt-0.5" />}
              <span>{testStatus === 'testing' ? 'Testing connection…' : testMessage}</span>
            </div>
          )}

          {/* Disconnect zone */}
          {isConnected && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-4">
              <p className="text-[13px] font-medium text-red-700 dark:text-red-400 mb-1">
                Disconnect {integration.name}
              </p>
              <p className="text-[12px] text-red-600/70 dark:text-red-500/70 mb-3">
                This will remove the connection. Your existing data will not be affected.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-red-600 hover:text-red-500 hover:bg-red-500/10 gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {disconnecting
                  ? 'Disconnecting…'
                  : confirmDisconnect
                  ? 'Click again to confirm'
                  : 'Disconnect'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!isFormComplete || testStatus === 'testing'}
            className="gap-1.5"
          >
            {testStatus === 'testing' ? (
              <><Loader2 className="size-3.5 animate-spin" />Testing…</>
            ) : (
              'Test Connection'
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isFormComplete || saving}
              className="gap-1.5"
            >
              {saving ? 'Saving…' : isConnected ? 'Update' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { LayoutTemplate, Plus, Trash2, X } from 'lucide-react'
import { BUILT_IN_TEMPLATES } from '@/lib/templates'
import type { Template } from '@/lib/db/schema'
import { createTemplate, deleteTemplate } from '@/app/actions/templates'
import { toast } from '@/hooks/use-toast'

interface TemplatePickerProps {
  userTemplates: Template[]
  onApply: (content: string) => void
}

export function TemplatePicker({ userTemplates, onApply }: TemplatePickerProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [localUserTemplates, setLocalUserTemplates] = useState(userTemplates)

  function apply(content: string) {
    onApply(content)
    setOpen(false)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    const result = await createTemplate(name, description, '<p></p>')
    setSaving(false)
    if (result.template) {
      setLocalUserTemplates((prev) => [...prev, result.template!])
      setName('')
      setDescription('')
      setCreating(false)
      toast('Template created', { variant: 'success' })
    } else if (result.error) {
      toast(result.error, { variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteTemplate(id)
    if (result?.error) {
      toast(result.error, { variant: 'destructive' })
    } else {
      setLocalUserTemplates((prev) => prev.filter((t) => t.id !== id))
      toast('Template deleted', { variant: 'success' })
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground/90 hover:bg-muted transition-colors"
      >
        <LayoutTemplate className="size-3.5" />
        Templates
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-8 z-50 w-72 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Templates</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Built-in */}
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-1">Built-in</p>
                {BUILT_IN_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => apply(t.content)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <p className="text-sm text-foreground group-hover:text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>

              {/* User templates */}
              {localUserTemplates.length > 0 && (
                <div className="px-3 py-2 border-t border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-1">Custom</p>
                  {localUserTemplates.map((t) => (
                    <div key={t.id} className="flex items-center group">
                      <button
                        onClick={() => apply(t.content)}
                        className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
                      >
                        <p className="text-sm text-foreground">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{t.description}</p>}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-muted-foreground/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mr-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create custom */}
            <div className="border-t border-border p-3">
              {creating ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Template name"
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground/90 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#097fe8]"
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground/90 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#097fe8]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={saving || !name.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-[#0075de] hover:bg-[#0075de] disabled:opacity-50 text-xs font-medium text-white transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save Template'}
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="size-3.5" />
                  Save current notes as template
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

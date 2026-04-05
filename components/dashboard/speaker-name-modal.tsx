'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SpeakerAvatar } from '@/components/ui/speaker-avatar'
import { saveSpeakerMappings } from '@/app/actions/meetings'
import { toast } from '@/hooks/use-toast'

interface SpeakerNameModalProps {
  open: boolean
  onClose: () => void
  meetingId: string
  speakerKeys: string[]
  onSaved: (mappings: Record<string, string>) => void
}

export function SpeakerNameModal({
  open,
  onClose,
  meetingId,
  speakerKeys,
  onSaved,
}: SpeakerNameModalProps) {
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(speakerKeys.map((k) => [k, '']))
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const mappings: Record<string, string> = {}
    for (const key of speakerKeys) {
      mappings[key] = names[key]?.trim() || key
    }
    const result = await saveSpeakerMappings(meetingId, mappings)
    setSaving(false)
    if (result?.error) {
      toast(result.error, { variant: 'destructive' })
    } else {
      toast('Speaker names saved', { variant: 'success' })
      onSaved(mappings)
      onClose()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Users className="size-5 text-purple-500" strokeWidth={1.75} />
              </div>
              <Dialog.Close asChild>
                <button className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Title className="text-[17px] font-semibold text-foreground">
              Who was in this meeting?
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-muted-foreground mt-1">
              Add names to make your transcript easier to read. You can always rename later.
            </Dialog.Description>
          </div>

          {/* Speakers */}
          <div className="px-6 pb-5 space-y-3">
            {speakerKeys.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <div className="shrink-0 rounded-full overflow-hidden">
                  <SpeakerAvatar name={names[key]?.trim() || key} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder={key}
                    value={names[key] || ''}
                    onChange={(e) => setNames((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Skip for now
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? 'Saving…' : 'Save names'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

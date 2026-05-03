'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Sun, ClipboardList, Phone, UsersRound,
  Target, CheckCircle, Folder, Briefcase, Star,
  Zap, Lightbulb, Rocket, Mic, Handshake, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createFolder } from '@/app/actions/folders'
import { toast } from '@/hooks/use-toast'

interface IconOption { id: string; Icon: LucideIcon }

const ICON_OPTIONS: IconOption[] = [
  { id: 'folder', Icon: Folder },
  { id: 'users', Icon: Users },
  { id: 'phone', Icon: Phone },
  { id: 'clipboard', Icon: ClipboardList },
  { id: 'target', Icon: Target },
  { id: 'briefcase', Icon: Briefcase },
  { id: 'check', Icon: CheckCircle },
  { id: 'sun', Icon: Sun },
  { id: 'star', Icon: Star },
  { id: 'zap', Icon: Zap },
  { id: 'lightbulb', Icon: Lightbulb },
  { id: 'rocket', Icon: Rocket },
  { id: 'usersround', Icon: UsersRound },
  { id: 'mic', Icon: Mic },
  { id: 'handshake', Icon: Handshake },
  { id: 'trending', Icon: TrendingUp },
]

const PRESET_FOLDERS: { name: string; iconId: string; Icon: LucideIcon }[] = [
  { name: 'User interviews', iconId: 'users', Icon: Users },
  { name: 'Standups', iconId: 'sun', Icon: Sun },
  { name: 'Projects', iconId: 'clipboard', Icon: ClipboardList },
  { name: 'Sales calls', iconId: 'phone', Icon: Phone },
  { name: 'Team meetings', iconId: 'usersround', Icon: UsersRound },
  { name: 'Coaching', iconId: 'target', Icon: Target },
  { name: 'Customer check-ins', iconId: 'check', Icon: CheckCircle },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFolderDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [iconId, setIconId] = useState('folder')
  const [creating, setCreating] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  function reset() {
    setName('')
    setDescription('')
    setIconId('folder')
    setShowIconPicker(false)
  }

  function selectPreset(p: { name: string; iconId: string }) {
    setName(p.name)
    setIconId(p.iconId)
  }

  async function handleCreate() {
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const result = await createFolder(name, description, iconId)
      toast('Folder created', { variant: 'success' })
      onOpenChange(false)
      reset()
      router.push(`/dashboard/folder/${result.id}`)
    } catch {
      toast('Failed to create folder', { variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const ActiveIcon = ICON_OPTIONS.find((o) => o.id === iconId)?.Icon ?? Folder

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px]">Create folder</DialogTitle>
          <p className="text-[13px] text-muted-foreground -mt-1">Use templates below to get started quickly</p>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Title + icon */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">Title and icon</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background focus-within:border-[#0075de]/50 focus-within:ring-2 focus-within:ring-[#0075de]/10 transition-all">
              <div className="relative">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="size-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ActiveIcon className="size-4" strokeWidth={1.75} />
                </button>
                {showIconPicker && (
                  <div className="absolute top-9 left-0 z-50 bg-background border border-border rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-[152px]">
                    {ICON_OPTIONS.map(({ id, Icon }) => (
                      <button
                        key={id}
                        onClick={() => { setIconId(id); setShowIconPicker(false) }}
                        className={`size-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground ${iconId === id ? 'bg-muted text-foreground' : ''}`}
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Choose a helpful name"
                className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Preset suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_FOLDERS.map((p) => (
              <button
                key={p.name}
                onClick={() => selectPreset(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium transition-colors ${
                  name === p.name
                    ? 'border-[#0075de]/40 bg-[#0075de]/10 text-[#0075de]'
                    : 'border-border bg-muted/30 text-foreground hover:bg-muted/60'
                }`}
              >
                <p.Icon className="size-3" strokeWidth={2} />
                {p.name}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Help Notus AI understand the purpose of this folder"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#0075de]/50 focus:ring-2 focus:ring-[#0075de]/10 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { onOpenChange(false); reset() }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="bg-[#0075de] hover:bg-[#005bab] text-white"
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

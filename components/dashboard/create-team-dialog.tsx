'use client'

import { useState, useRef } from 'react'
import { Plus, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createTeam } from '@/app/actions/teams'

interface CreateTeamDialogProps {
  trigger?: 'icon' | 'button'
}

export function CreateTeamDialog({ trigger = 'icon' }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const fd = new FormData(e.currentTarget)
      await createTeam(fd)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {trigger === 'icon' ? (
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 active:scale-[0.97]"
          style={{ transition: 'transform 150ms ease-out, background-color 150ms ease-out' }}
        >
          <Plus className="size-3.5" />
          New team
        </Button>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 active:scale-[0.97]"
          style={{ transition: 'transform 150ms ease-out, background-color 150ms ease-out' }}
        >
          <Users className="size-4" />
          Create your first team
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a team</DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground" htmlFor="team-name">
                Team name
              </label>
              <Input
                id="team-name"
                name="name"
                placeholder="e.g. Product, Engineering…"
                autoFocus
                required
                minLength={2}
                maxLength={64}
                disabled={pending}
              />
              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create team'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

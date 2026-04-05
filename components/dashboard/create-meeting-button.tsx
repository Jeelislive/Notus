'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BUILT_IN_TEMPLATES } from '@/lib/templates'
import { createMeeting } from '@/app/actions/meetings'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const TEMPLATE_ICONS: Record<string, string> = {
  'customer-discovery': '🔍',
  'one-on-one': '👥',
  'sales-call': '📈',
  'user-interview': '🎙️',
  'daily-standup': '☀️',
}

type MeetingType = 'one_on_one' | 'team_meeting' | 'standup' | 'interview' | 'client' | 'other'

const TEMPLATE_TO_TYPE: Record<string, MeetingType> = {
  'one-on-one':         'one_on_one',
  'daily-standup':      'standup',
  'sales-call':         'client',
  'customer-discovery': 'interview',
  'user-interview':     'interview',
}

export function CreateMeetingButton() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'title' | 'template'>('title')
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleOpen() {
    setOpen(true)
    setStep('title')
    setTitle('')
    setSelectedTemplateId(null)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setStep('template')
  }

  function handleCreate() {
    const template = BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId)
    const fd = new FormData()
    fd.set('title', title.trim() || 'Untitled Meeting')
    fd.set('meetingType', selectedTemplateId ? (TEMPLATE_TO_TYPE[selectedTemplateId] ?? 'other') : 'other')
    fd.set('templateContent', template?.content ?? '')
    fd.set('templateId', '') // built-in templates don't have DB UUIDs
    fd.set('templateName', template?.name ?? '')
    startTransition(async () => {
      try {
        const result = await createMeeting(fd)
        if (result.meeting) {
          toast('Meeting created', { variant: 'success' })
          handleClose()
          router.push(`/dashboard/meetings/${result.meeting.id}`)
        }
      } catch (error) {
        toast('Failed to create meeting', { variant: 'destructive' })
      }
    })
  }

  return (
    <>
      <Button size="sm" className="gap-1.5 active:scale-[0.97]" style={{ transition: 'transform 150ms ease-out' }} onClick={handleOpen}>
        <Plus className="size-4" />
        New meeting
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          {step === 'title' ? (
            <>
              <DialogHeader>
                <DialogTitle>New meeting</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNext} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Meeting title</label>
                  <Input
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q2 Planning, 1-on-1 with Sarah…"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" className="gap-1.5" disabled={!title.trim()}>
                    Next
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Choose a template</DialogTitle>
              </DialogHeader>

              <p className="text-[13px] text-muted-foreground -mt-1">
                AI will structure your notes using the template after recording ends.
              </p>

              <div className="grid grid-cols-2 gap-2 py-1">
                {/* None option */}
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  className={`relative text-left p-4 rounded-xl border-2 active:scale-[0.97] ${
                    selectedTemplateId === null
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                  style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), border-color 120ms ease-out, background-color 120ms ease-out' }}
                >
                  {selectedTemplateId === null && (
                    <span className="absolute top-2.5 right-2.5 size-4 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="size-2.5 text-white" />
                    </span>
                  )}
                  <div className="text-[20px] mb-2">📝</div>
                  <p className="text-[13px] font-semibold text-foreground">No template</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Free-form notes</p>
                </button>

                {/* Built-in templates */}
                {BUILT_IN_TEMPLATES.map((t) => {
                  const active = selectedTemplateId === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`relative text-left p-4 rounded-xl border-2 active:scale-[0.97] ${
                        active
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : 'border-border hover:border-border/80 hover:bg-muted/30'
                      }`}
                      style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), border-color 120ms ease-out, background-color 120ms ease-out' }}
                    >
                      {active && (
                        <span className="absolute top-2.5 right-2.5 size-4 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="size-2.5 text-white" />
                        </span>
                      )}
                      <div className="text-[20px] mb-2">{TEMPLATE_ICONS[t.id] ?? '📄'}</div>
                      <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStep('title')} className="gap-1.5">
                  <ArrowLeft className="size-3.5" />
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isPending} className="gap-1.5">
                  {isPending ? 'Creating…' : 'Create meeting'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

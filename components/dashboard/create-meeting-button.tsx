'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, ArrowRight, ArrowLeft, FileText, Users, ListChecks, UserPlus, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BUILT_IN_TEMPLATES } from '@/lib/templates'
import { createMeeting } from '@/app/actions/meetings'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const VISIBLE_TEMPLATES = ['one-on-one', 'daily-standup']

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  'one-on-one': Users,
  'daily-standup': ListChecks,
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
  const [step, setStep] = useState<'title' | 'template' | 'attendees'>('title')
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<string[]>(['', ''])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleOpen() {
    setOpen(true)
    setStep('title')
    setTitle('')
    setSelectedTemplateId(null)
    setAttendees(['', ''])
  }

  function handleClose() {
    setOpen(false)
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setStep('template')
  }

  function addAttendee() {
    setAttendees((prev) => [...prev, ''])
  }

  function removeAttendee(idx: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateAttendee(idx: number, val: string) {
    setAttendees((prev) => prev.map((v, i) => (i === idx ? val : v)))
  }

  function handleCreate(skipAttendees = false) {
    const template = BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId)
    const fd = new FormData()
    fd.set('title', title.trim() || 'Untitled Meeting')
    fd.set('meetingType', selectedTemplateId ? (TEMPLATE_TO_TYPE[selectedTemplateId] ?? 'other') : 'other')
    fd.set('templateContent', template?.content ?? '')
    fd.set('templateId', '')
    fd.set('templateName', template?.name ?? '')
    if (!skipAttendees) {
      const filled = attendees.map((n) => n.trim()).filter(Boolean)
      fd.set('attendees', filled.join(','))
    }
    startTransition(async () => {
      try {
        const result = await createMeeting(fd)
        if (result.meeting) {
          toast('Meeting created', { variant: 'success' })
          handleClose()
          router.push(`/dashboard/meetings/${result.meeting.id}`)
        }
      } catch {
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
          {step === 'title' && (
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
          )}

          {step === 'template' && (
            <>
              <DialogHeader>
                <DialogTitle>Choose a template</DialogTitle>
              </DialogHeader>

              <p className="text-[13px] text-muted-foreground -mt-1">
                AI will structure your notes using the template after recording ends.
              </p>

              <div className="grid grid-cols-2 gap-2 py-1">
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  className={`relative text-left p-4 rounded-xl border-2 active:scale-[0.97] ${
                    selectedTemplateId === null
                      ? 'border-[#0075de] bg-[#0075de]/[0.04]'
                      : 'border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                  style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), border-color 120ms ease-out, background-color 120ms ease-out' }}
                >
                  {selectedTemplateId === null && (
                    <span className="absolute top-2.5 right-2.5 size-4 rounded-full bg-[#0075de] flex items-center justify-center">
                      <Check className="size-2.5 text-white" />
                    </span>
                  )}
                  <FileText className="size-5 mb-2 text-muted-foreground" />
                  <p className="text-[13px] font-semibold text-foreground">No template</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Free-form notes</p>
                </button>

                {BUILT_IN_TEMPLATES.filter((t) => VISIBLE_TEMPLATES.includes(t.id)).map((t) => {
                  const active = selectedTemplateId === t.id
                  const Icon = TEMPLATE_ICONS[t.id]
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`relative text-left p-4 rounded-xl border-2 active:scale-[0.97] ${
                        active
                          ? 'border-[#0075de] bg-[#0075de]/[0.04]'
                          : 'border-border hover:border-border/80 hover:bg-muted/30'
                      }`}
                      style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), border-color 120ms ease-out, background-color 120ms ease-out' }}
                    >
                      {active && (
                        <span className="absolute top-2.5 right-2.5 size-4 rounded-full bg-[#0075de] flex items-center justify-center">
                          <Check className="size-2.5 text-white" />
                        </span>
                      )}
                      {Icon && <Icon className="size-5 mb-2 text-muted-foreground" />}
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
                <Button onClick={() => setStep('attendees')} className="gap-1.5">
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </>
          )}

          {step === 'attendees' && (
            <>
              <DialogHeader>
                <DialogTitle>Who&apos;s in this meeting?</DialogTitle>
              </DialogHeader>

              <p className="text-[13px] text-muted-foreground -mt-1">
                Enter attendee names so the transcript labels speakers correctly.
              </p>

              <div className="space-y-2 py-1">
                {attendees.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-semibold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <Input
                      value={name}
                      onChange={(e) => updateAttendee(idx, e.target.value)}
                      placeholder={`Person ${idx + 1}`}
                      className="h-9 text-[14px]"
                      autoFocus={idx === 0}
                    />
                    {attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(idx)}
                        className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAttendee}
                  className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                  <UserPlus className="size-3.5" />
                  Add person
                </button>
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStep('template')} className="gap-1.5">
                  <ArrowLeft className="size-3.5" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => handleCreate(true)} disabled={isPending}>
                    Skip
                  </Button>
                  <Button onClick={() => handleCreate(false)} disabled={isPending} className="gap-1.5">
                    {isPending ? 'Creating…' : 'Create meeting'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { FileText, Save } from 'lucide-react'
import type { Note } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { updateNoteContent } from '@/app/actions/meetings'

interface NotesPanelProps {
  note: Note | null
  meetingId: string
  status: string
}

export function NotesPanel({ note, meetingId, status }: NotesPanelProps) {
  const [content, setContent] = useState(note?.content ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(true)

  function handleChange(value: string) {
    setContent(value)
    setSaved(false)
  }

  function handleSave() {
    startTransition(async () => {
      await updateNoteContent(meetingId, content)
      setSaved(true)
    })
  }

  // Auto-save on blur
  function handleBlur() {
    if (!saved) handleSave()
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-zinc-500" strokeWidth={1.5} />
          <span className="text-sm font-medium text-zinc-300">Notes</span>
        </div>
        <div className="flex items-center gap-2">
          {!saved && (
            <span className="text-xs text-zinc-600">Unsaved changes</span>
          )}
          {saved && content && (
            <span className="text-xs text-zinc-700">Saved</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isPending || saved}
            className="h-7 px-2.5 text-xs gap-1.5"
          >
            <Save className="size-3" />
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* AI summary (if completed) */}
      {note?.summary && (
        <div className="mx-5 mt-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-1">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">AI Summary</p>
          <p className="text-sm text-zinc-400 leading-relaxed">{note.summary}</p>
        </div>
      )}

      {/* Action items (if completed) */}
      {note?.actionItems && (
        <div className="mx-5 mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 space-y-2">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Action Items</p>
          {JSON.parse(note.actionItems).map((item: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <div className="size-3.5 rounded-sm border border-emerald-500/30 mt-0.5 shrink-0" />
              <p className="text-sm text-zinc-400">{item}</p>
            </div>
          ))}
        </div>
      )}

      {/* Text area */}
      <div className="flex-1 p-5">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={
            status === 'pending'
              ? 'Take notes here during your meeting...'
              : status === 'processing'
              ? 'AI is processing your notes...'
              : 'Your notes...'
          }
          disabled={status === 'processing'}
          className="w-full h-full min-h-[460px] bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  )
}

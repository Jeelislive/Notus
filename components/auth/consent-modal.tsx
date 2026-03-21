'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConsentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConsentModal({ open, onOpenChange }: ConsentModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <Dialog.Title className="text-lg font-semibold text-zinc-100">
              Recording Consent Policy
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
            <section>
              <h3 className="font-semibold text-zinc-200 mb-2">Your Responsibility</h3>
              <p>
                When you use Notus to record meetings, you are responsible for obtaining
                informed consent from all meeting participants before recording begins.
                This is a legal requirement in many jurisdictions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-zinc-200 mb-2">Legal Requirements</h3>
              <ul className="space-y-2 list-none">
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">•</span>
                  <span><strong className="text-zinc-300">GDPR (EU):</strong> Requires explicit consent for recording individuals. You must inform participants and obtain consent before recording.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">•</span>
                  <span><strong className="text-zinc-300">CCPA (California):</strong> Requires disclosure of data collection practices. Inform participants how their voice data will be used.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">•</span>
                  <span><strong className="text-zinc-300">Wiretapping Laws:</strong> Many US states and countries require all-party consent for recording conversations. Know your local laws.</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-zinc-200 mb-2">How to Inform Participants</h3>
              <ul className="space-y-1 list-none">
                <li className="flex gap-2"><span className="text-indigo-400">•</span> Verbally announce at the start of the meeting: "This meeting is being recorded"</li>
                <li className="flex gap-2"><span className="text-indigo-400">•</span> Include a recording notice in your meeting invite</li>
                <li className="flex gap-2"><span className="text-indigo-400">•</span> Use meeting platforms that display a recording indicator</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-zinc-200 mb-2">Data Processing</h3>
              <p>
                Audio recordings are processed by Deepgram for transcription and Claude AI for note
                generation. Audio files are stored securely in Supabase Storage and can be deleted
                at any time from your dashboard.
              </p>
            </section>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-amber-300 text-xs">
              <strong>Disclaimer:</strong> This policy provides general guidance only and does not
              constitute legal advice. Consult a legal professional for advice specific to your
              jurisdiction and use case.
            </div>
          </div>

          <div className="mt-6">
            <Dialog.Close asChild>
              <Button className="w-full">Got it</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

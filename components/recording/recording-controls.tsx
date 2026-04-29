'use client'

import { Mic, Square, Loader2, AlertCircle, Monitor } from 'lucide-react'
import type { RecordingStatus } from '@/hooks/use-recording'
import { Button } from '@/components/ui/button'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function AudioWaveform({ level }: { level: number }) {
  const bars = [0.5, 0.75, 1.0, 0.85, 0.6, 0.75, 0.5]
  const scaled = Math.min(1, Math.sqrt(level * 8))
  return (
    <div className="flex items-center gap-[2px] h-4">
      {bars.map((base, i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full bg-red-400"
          style={{ height: `${Math.max(2, Math.round(base * scaled * 14))}px`, transition: 'height 75ms ease-out' }}
        />
      ))}
    </div>
  )
}

function supportsTabAudio(): boolean {
  if (typeof window === 'undefined') return false
  return typeof navigator?.mediaDevices?.getDisplayMedia === 'function'
}

interface RecordingControlsProps {
  status: RecordingStatus
  error: string | null
  elapsedSeconds: number
  audioLevel: number
  initialStatus: string
  onStart: () => void
  onStop: () => void
}

export function RecordingControls({ status, error, elapsedSeconds, audioLevel, initialStatus, onStart, onStop }: RecordingControlsProps) {
  if (initialStatus === 'completed' || initialStatus === 'processing') return null

  const tabAudioAvailable = supportsTabAudio()

  if (status === 'recording') {
    return (
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3">
          <span className="size-2 rounded-full bg-red-500 animate-rec shrink-0" />
          <span className="text-[14px] font-mono font-semibold text-red-500 tabular-nums">{formatTime(elapsedSeconds)}</span>
          <AudioWaveform level={audioLevel} />
          <span className="text-[13px] text-muted-foreground hidden sm:block">Recording in progress</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500"
        >
          <Square className="size-3 fill-current" />
          Stop
        </Button>
      </div>
    )
  }

  if (status === 'requesting') {
    return (
      <div className="flex items-center gap-2.5 px-5 py-4 rounded-2xl border border-border text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Requesting microphone access…
      </div>
    )
  }

  if (status === 'stopping') {
    return (
      <div className="flex items-center gap-2.5 px-5 py-4 rounded-2xl border border-border text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Finalizing recording and generating transcript…
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between p-5 rounded-2xl border border-border">
        <div className="space-y-0.5">
          <p className="text-[15px] font-semibold text-foreground">Start recording</p>
          <p className="text-[13px] text-muted-foreground">
            {tabAudioAvailable
              ? 'Capture tab or mic audio - transcript appears in real time'
              : 'Capture microphone audio with live transcription'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 ml-4 shrink-0">
          {tabAudioAvailable ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0075de]/10 border border-[#0075de]/20">
              <Monitor className="size-3 text-[#0075de]" />
              <span className="text-[11px] font-medium text-[#0075de] dark:text-[#62aef0]">Tab audio</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Mic className="size-3 text-amber-500" />
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Mic only</span>
            </div>
          )}
          <Button
            onClick={onStart}
            className="gap-2 bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/20 active:scale-[0.97]"
            style={{ transition: 'transform 150ms ease-out, background-color 150ms ease-out' }}
          >
            <span className="size-2 rounded-full bg-white/90 animate-rec" />
            Record
          </Button>
        </div>
      </div>

      {!tabAudioAvailable && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[12px] text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          Tab audio capture requires Chrome or Edge. On your current browser, only microphone recording is available.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/15 text-[13px] text-red-600 dark:text-red-400">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}

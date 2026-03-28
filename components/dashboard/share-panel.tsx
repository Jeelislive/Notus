'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, Check, X, Globe, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SharePanelProps {
  meetingId: string
  initialToken: string | null
}

export function SharePanel({ meetingId, initialToken }: SharePanelProps) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState(initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const shareUrl = token ? `${appUrl}/share/${token}` : null

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function enable() {
    setLoading(true)
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    })
    if (res.ok) {
      const data = await res.json()
      setToken(data.token)
    }
    setLoading(false)
  }

  async function disable() {
    setLoading(true)
    await fetch('/api/share', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    })
    setToken(null)
    setLoading(false)
  }

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5">
        <Share2 className="size-3.5" />
        Share
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-border bg-background shadow-xl shadow-black/10 overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[14px] font-semibold text-foreground">Share meeting</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" style={{ transition: 'color 120ms ease-out' }}>
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${token ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                  {token ? <Globe className="size-4 text-emerald-600 dark:text-emerald-400" /> : <Lock className="size-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">{token ? 'Anyone with the link' : 'Only you'}</p>
                  <p className="text-[12px] text-muted-foreground">{token ? 'Can view this meeting' : 'This meeting is private'}</p>
                </div>
              </div>
              <button
                onClick={token ? disable : enable}
                disabled={loading}
                className={`relative w-10 h-6 rounded-full shrink-0 mt-1 ${token ? 'bg-emerald-500' : 'bg-muted'}`}
                style={{ transition: 'background-color 200ms ease-out' }}
              >
                {loading ? (
                  <Loader2 className="size-3 animate-spin absolute inset-0 m-auto text-white" />
                ) : (
                  <span
                    className="absolute size-4 rounded-full bg-white shadow-sm top-1"
                    style={{ left: token ? '22px' : '4px', transition: 'left 200ms cubic-bezier(0.23,1,0.32,1)' }}
                  />
                )}
              </button>
            </div>

            {/* Share URL */}
            {shareUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
                  <span className="flex-1 text-[12px] text-muted-foreground truncate font-mono">{shareUrl}</span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    style={{ transition: 'color 120ms ease-out' }}
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
                <Button size="sm" className="w-full gap-1.5" onClick={copyLink}>
                  {copied ? <><Check className="size-3.5" />Copied!</> : <><Copy className="size-3.5" />Copy link</>}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

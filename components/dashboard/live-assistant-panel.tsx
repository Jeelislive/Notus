'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, X, Sparkles, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react'
import { ShiningText } from '@/components/ui/shining-text'
import type { LiveSegment } from '@/hooks/use-recording'

interface Suggestion {
  type: 'suggestion' | 'contradiction' | 'context'
  text: string
  color: 'green' | 'blue' | 'red' | 'orange' | 'amber' | 'purple'
}

interface HighlightedSegment {
  content: string
  type: 'decision' | 'question' | 'action' | 'risk' | 'agreement'
}

interface LiveAssistantPanelProps {
  liveSegments: LiveSegment[]
  meetingId: string
  meetingTitle: string
  isRecording: boolean
  open: boolean
  onClose: () => void
}

const COLOR_MAP: Record<string, string> = {
  green: 'border-l-4 border-emerald-500 bg-emerald-500/5',
  blue: 'border-l-4 border-blue-500 bg-blue-500/5',
  red: 'border-l-4 border-red-500 bg-red-500/5',
  orange: 'border-l-4 border-orange-500 bg-orange-500/5',
  amber: 'border-l-4 border-amber-500 bg-amber-500/5',
  purple: 'border-l-4 border-purple-500 bg-purple-500/5',
}

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  decision: 'border-l-4 border-emerald-500/70 bg-emerald-500/5',
  question: 'border-l-4 border-blue-500/70 bg-blue-500/5',
  action: 'border-l-4 border-orange-500/70 bg-orange-500/5',
  risk: 'border-l-4 border-amber-500/70 bg-amber-500/5',
  agreement: 'border-l-4 border-purple-500/70 bg-purple-500/5',
}

const TYPE_LABELS: Record<string, string> = {
  suggestion: 'Suggestion',
  contradiction: 'Contradiction',
  context: 'Context',
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  decision: 'Decision',
  question: 'Question',
  action: 'Action Item',
  risk: 'Risk',
  agreement: 'Agreement',
}

function SuggestionIcon({ type }: { type: string }) {
  const cls = 'size-4 shrink-0'
  if (type === 'suggestion') return <Lightbulb className={cls} />
  if (type === 'contradiction') return <AlertTriangle className={cls} />
  return <Sparkles className={cls} />
}

function HighlightIcon({ type }: { type: string }) {
  const cls = 'size-4 shrink-0'
  if (type === 'decision' || type === 'agreement') return <CheckCircle className={cls} />
  if (type === 'risk') return <AlertTriangle className={cls} />
  return <Sparkles className={cls} />
}

const ICON_COLOR: Record<string, string> = {
  green: 'text-emerald-500',
  blue: 'text-blue-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
}

const HIGHLIGHT_ICON_COLOR: Record<string, string> = {
  decision: 'text-emerald-500',
  question: 'text-blue-500',
  action: 'text-orange-500',
  risk: 'text-amber-500',
  agreement: 'text-purple-500',
}

export function LiveAssistantPanel({
  liveSegments,
  meetingId,
  meetingTitle,
  isRecording,
  open,
  onClose,
}: LiveAssistantPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [highlights, setHighlights] = useState<HighlightedSegment[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'suggestions' | 'highlights'>('suggestions')
  const lastSegCountRef = useRef(0)
  const analyzingRef = useRef(false)
  // Keep a ref to liveSegments so the interval callback always sees the latest value
  const liveSegmentsRef = useRef(liveSegments)
  useEffect(() => { liveSegmentsRef.current = liveSegments }, [liveSegments])

  // Poll every 15 s during recording - fires regardless of how fast new segments arrive
  useEffect(() => {
    if (!isRecording) return

    async function analyze() {
      const segs = liveSegmentsRef.current
      if (analyzingRef.current || segs.length === 0 || segs.length === lastSegCountRef.current) return

      analyzingRef.current = true
      lastSegCountRef.current = segs.length
      const recent = segs.slice(-10)

      setLoading(true)
      try {
        const res = await fetch('/api/ai/live-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId,
            recentSegments: recent.map((s) => ({
              speaker: s.speaker,
              content: s.content,
              startMs: s.startMs,
            })),
            meetingTitle,
          }),
        })

        if (res.ok) {
          const data = await res.json() as {
            suggestions: Suggestion[]
            highlightedSegments: HighlightedSegment[]
          }
          if (data.suggestions?.length) setSuggestions(data.suggestions)
          if (data.highlightedSegments?.length) setHighlights(data.highlightedSegments)
        }
      } catch (err) {
        console.error('[LiveAssistant] fetch error:', err)
      } finally {
        setLoading(false)
        analyzingRef.current = false
      }
    }

    const interval = setInterval(analyze, 15000)
    return () => clearInterval(interval)
  }, [isRecording, meetingId, meetingTitle])

  if (!open) return null

  return (
    <div
      className="flex flex-col rounded-2xl border border-border overflow-hidden h-full bg-background"
      style={{ width: 320, minWidth: 320 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg flex items-center justify-center bg-purple-500/10">
            <Bot className="size-3.5 text-purple-500" strokeWidth={1.75} />
          </div>
          <span className="text-[14px] font-semibold text-foreground">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="size-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors duration-150 active:scale-[0.97]"
        >
          <X className="size-4 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {(['suggestions', 'highlights'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
              activeTab === tab
                ? 'text-foreground border-b-2 border-purple-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'suggestions' ? 'Suggestions' : 'Highlights'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <ShiningText text="Analyzing..." className="text-[13px]" />
          </div>
        )}

        {!loading && activeTab === 'suggestions' && (
          <>
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-10 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Bot className="size-5 text-muted-foreground/40" strokeWidth={1} />
                </div>
                <p className="text-[13px] text-muted-foreground">Listening for insights…</p>
              </div>
            ) : (
              suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-3 ${COLOR_MAP[s.color] ?? COLOR_MAP.blue}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 ${ICON_COLOR[s.color] ?? 'text-blue-500'}`}>
                      <SuggestionIcon type={s.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground leading-relaxed">{s.text}</p>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {!loading && activeTab === 'highlights' && (
          <>
            {highlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-10 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Sparkles className="size-5 text-muted-foreground/40" strokeWidth={1} />
                </div>
                <p className="text-[13px] text-muted-foreground">Listening for insights…</p>
              </div>
            ) : (
              highlights.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-3 ${HIGHLIGHT_COLOR_MAP[h.type] ?? ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 ${HIGHLIGHT_ICON_COLOR[h.type] ?? 'text-blue-500'}`}>
                      <HighlightIcon type={h.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground leading-relaxed">{h.content}</p>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        {HIGHLIGHT_LABELS[h.type] ?? h.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

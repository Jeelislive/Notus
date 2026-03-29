'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, Sparkles, FileText, Mic, Tag } from 'lucide-react'
import { ShiningText } from '@/components/ui/shining-text'
import type { SearchResult } from '@/app/api/search/route'

const SUGGESTED_QUERIES = [
  'pricing discussed',
  'action items',
  'next steps',
  'follow up',
  'decision made',
  'budget approved',
]

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const words = query.trim().split(/\s+/).filter(Boolean)
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200/60 dark:bg-yellow-900/40 rounded px-0.5 text-foreground not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SourceBadge({ type }: { type: SearchResult['type'] }) {
  if (type === 'transcript') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
        <Mic className="size-3" strokeWidth={2} />
        Transcript
      </span>
    )
  }
  if (type === 'note') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
        <FileText className="size-3" strokeWidth={2} />
        Note
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
      <Tag className="size-3" strokeWidth={2} />
      Title
    </span>
  )
}

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const href =
    result.type === 'note'
      ? `/dashboard/notes?meeting=${result.meetingId}`
      : `/dashboard/meetings/${result.meetingId}`

  return (
    <Link
      href={href}
      className="group block p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-[0.97]"
      style={{ transition: 'background-color 120ms ease-out, border-color 120ms ease-out' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="size-9 rounded-lg bg-primary/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
            {result.meetingTitle.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-medium text-foreground truncate">
              {highlight(result.meetingTitle, query)}
            </p>
            <SourceBadge type={result.type} />
            {result.speakerLabel && (
              <span className="text-[11px] text-muted-foreground">{result.speakerLabel}</span>
            )}
          </div>

          {/* Date */}
          {result.meetingDate && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(result.meetingDate)}</p>
          )}

          {/* Snippet */}
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
            {highlight(result.snippet, query)}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function SearchPageClient() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [searched, setSearched] = useState(false)
  const [usedKeyword, setUsedKeyword] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(
    async (q: string, ai: boolean) => {
      if (!q.trim() || q.trim().length < 2) {
        setResults([])
        setSearched(false)
        setUsedKeyword('')
        return
      }
      setLoading(true)
      setSearched(true)
      try {
        const url = `/api/search?q=${encodeURIComponent(q)}${ai ? '&ai=true' : ''}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.results ?? [])
        setUsedKeyword(data.keyword ?? q)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query, aiMode)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, aiMode, doSearch])

  function handleSuggestion(s: string) {
    setQuery(s)
    inputRef.current?.focus()
  }

  const showEmpty = searched && !loading && results.length === 0
  const showResults = searched && !loading && results.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 h-full md:h-auto overflow-y-auto md:overflow-visible min-h-0 md:min-h-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Search</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Search across all your meetings, notes, and transcripts
        </p>
      </div>

      {/* Search bar + AI toggle */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings, notes, transcripts..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            style={{ transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out' }}
          />
        </div>

        {/* AI Mode toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            {aiMode
              ? 'AI mode: Groq interprets your query into keywords'
              : 'Standard mode: exact keyword match'}
          </p>
          <button
            onClick={() => setAiMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border active:scale-[0.97] ${
              aiMode
                ? 'bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
            }`}
            style={{ transition: 'background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out' }}
          >
            <Sparkles className="size-3.5" strokeWidth={2} />
            AI Mode
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <ShiningText text="Searching..." className="text-[15px]" />
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <p className="text-[13px] text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {aiMode && usedKeyword && usedKeyword !== query ? (
              <> — AI searched for &ldquo;<span className="font-medium text-foreground">{usedKeyword}</span>&rdquo;</>
            ) : null}
          </p>
          {results.map((r) => (
            <ResultCard key={r.meetingId} result={r} query={usedKeyword || query} />
          ))}
        </div>
      )}

      {/* No results */}
      {showEmpty && (
        <div className="text-center py-12 space-y-2">
          <p className="text-[15px] font-medium text-foreground">
            No meetings found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-[13px] text-muted-foreground">
            Try different keywords or enable AI mode for natural language search.
          </p>
        </div>
      )}

      {/* Empty state with suggestions */}
      {!searched && !loading && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground font-medium">Suggested searches</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-1.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-[0.97]"
                style={{ transition: 'background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

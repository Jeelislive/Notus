'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  total: number
  completed: number
  inFolders: number
  searchQuery?: string
  searchResultCount?: number
}

export function DashboardHeader({ total, completed, inFolders, searchQuery, searchResultCount }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(searchQuery ?? '')
  const [, startTransition] = useTransition()

  function handleSearch(val: string) {
    setQuery(val)
    startTransition(() => {
      const params = new URLSearchParams()
      if (val.trim()) params.set('q', val.trim())
      router.replace(`/dashboard${val.trim() ? `?${params}` : ''}`)
    })
  }

  return (
    <div className="px-6 md:px-8 pt-7 pb-5 border-b border-border shrink-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[26px] text-foreground leading-tight"
            style={{ fontFamily: 'var(--font-display), EB Garamond, Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Meetings
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            {searchQuery
              ? `${searchResultCount} result${searchResultCount !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${total} total · ${completed} completed · ${inFolders} in folders`}
          </p>
        </div>

        <div className="mt-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search meetings…"
            className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-border bg-muted/30 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/15 focus:w-64 transition-all"
          />
        </div>
      </div>
    </div>
  )
}

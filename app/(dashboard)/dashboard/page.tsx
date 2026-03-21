import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getMeetingsByUser, searchMeetingsByUser } from '@/lib/db/queries'
import { MeetingList } from '@/components/dashboard/meeting-list'
import { CreateMeetingButton } from '@/components/dashboard/create-meeting-button'

export const metadata: Metadata = { title: 'Meetings | Notus' }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meetings = q
    ? await searchMeetingsByUser(user.id, q)
    : await getMeetingsByUser(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Meetings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
            {q ? ` matching "${q}"` : ''}
          </p>
        </div>
        <CreateMeetingButton />
      </div>

      {/* Search */}
      <MeetingSearchBar defaultValue={q} />

      {/* List */}
      <MeetingList meetings={meetings} />
    </div>
  )
}

// Inline search bar (server-compatible)
function MeetingSearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/dashboard">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Search meetings..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>
    </form>
  )
}

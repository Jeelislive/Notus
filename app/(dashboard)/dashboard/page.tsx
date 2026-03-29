import type { Metadata } from 'next'
import { Video, CheckCircle2, Clock, CalendarDays } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getMeetingsByUser, searchMeetingsByUser } from '@/lib/db/queries'
import { MeetingTable } from '@/components/dashboard/meeting-list'
import { CreateMeetingButton } from '@/components/dashboard/create-meeting-button'

export const metadata: Metadata = { title: 'Meetings | Notus' }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { q } = await searchParams
  const session = await getSession()
  if (!session) return null

  const meetings = q
    ? await searchMeetingsByUser(session.user.id, q)
    : await getMeetingsByUser(session.user.id)

  // Compute stats
  const totalMeetings = meetings.length
  const completedMeetings = meetings.filter((m) => m.status === 'completed').length
  const totalMinutes = Math.round(
    meetings.reduce((sum, m) => sum + (m.durationSeconds ?? 0), 0) / 60
  )
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = meetings.filter((m) => new Date(m.createdAt) >= sevenDaysAgo).length

  return (
    <div className="-mx-4 md:-mx-8 -mt-16 md:-mt-8 flex flex-col h-full min-h-0">
      {/* Stats container — fixed, does not scroll */}
      <div className="border-b border-border shrink-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-none">
              Meetings
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {q
                ? `${meetings.length} result${meetings.length !== 1 ? 's' : ''} for "${q}"`
                : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <CreateMeetingButton />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
          {/* Total Meetings */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 border-r border-border">
            <div className="size-9 md:size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Video className="size-4 md:size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide md:tracking-widest text-muted-foreground leading-none mb-1 truncate">
                Total Meetings
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none tabular-nums">
                {totalMeetings}
              </p>
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 md:border-r border-border">
            <div className="size-9 md:size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-4 md:size-5 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide md:tracking-widest text-muted-foreground leading-none mb-1 truncate">
                Completed
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none tabular-nums">
                {completedMeetings}
              </p>
            </div>
          </div>

          {/* Total Minutes */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 border-r border-border border-t md:border-t-0">
            <div className="size-9 md:size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Clock className="size-4 md:size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide md:tracking-widest text-muted-foreground leading-none mb-1 truncate">
                Total Minutes
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none tabular-nums">
                {totalMinutes}
              </p>
            </div>
          </div>

          {/* This Week */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-4 md:py-5 border-t md:border-t-0">
            <div className="size-9 md:size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CalendarDays className="size-4 md:size-5 text-indigo-400" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide md:tracking-widest text-muted-foreground leading-none mb-1 truncate">
                This Week
              </p>
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none tabular-nums">
                {thisWeek}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table section — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <MeetingTable meetings={meetings} />
      </div>
    </div>
  )
}

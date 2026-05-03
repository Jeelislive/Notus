import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { getMeetingsByUser, searchMeetingsByUser, getFoldersByUser, ensureDefaultFolders, getAllMeetingsStats } from '@/lib/db/queries'
import { MeetingTable } from '@/components/dashboard/meeting-list'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

export const metadata: Metadata = { title: 'Meetings | Notus' }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { q } = await searchParams
  const session = await getSession()
  if (!session) return null

  await ensureDefaultFolders(session.user.id)

  const [meetingsList, folders, stats] = await Promise.all([
    q ? searchMeetingsByUser(session.user.id, q) : getMeetingsByUser(session.user.id),
    getFoldersByUser(session.user.id),
    getAllMeetingsStats(session.user.id),
  ])

  return (
    <div className="-mx-4 md:-mx-8 -mt-16 md:-mt-8 flex flex-col h-full min-h-0">
      <DashboardHeader
        total={stats.total}
        completed={stats.completed}
        inFolders={stats.inFolders}
        searchQuery={q}
        searchResultCount={q ? meetingsList.length : undefined}
      />

      {/* List — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <MeetingTable meetings={meetingsList} folders={folders} />
      </div>
    </div>
  )
}

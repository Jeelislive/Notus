import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getTeamById, getTeamMembers } from '@/lib/db/queries'
import { TeamDetailClient } from '@/components/dashboard/team-detail-client'

interface Props {
  params: Promise<{ teamId: string }>
}

export default async function TeamDetailPage({ params }: Props) {
  const { teamId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const [team, members] = await Promise.all([
    getTeamById(teamId, session.user.id),
    getTeamMembers(teamId),
  ])

  if (!team) notFound()

  return (
    <TeamDetailClient
      team={team}
      members={members}
      currentUserId={session.user.id}
    />
  )
}

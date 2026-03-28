import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getMeetingById, getTranscriptByMeetingId } from '@/lib/db/queries'
import { MeetingDetailHeader } from '@/components/dashboard/meeting-detail-header'
import { MeetingClient } from '@/components/dashboard/meeting-client'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const session = await getSession()
  if (!session) return { title: 'Meeting | Notus' }
  const meeting = await getMeetingById(id, session.user.id)
  return { title: `${meeting?.title ?? 'Meeting'} | Notus` }
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const [meeting, transcript] = await Promise.all([
    getMeetingById(id, session.user.id),
    getTranscriptByMeetingId(id),
  ])

  if (!meeting) notFound()

  return (
    <div className="space-y-6">
      <MeetingDetailHeader meeting={meeting} />
      <MeetingClient meeting={meeting} transcript={transcript} />
    </div>
  )
}

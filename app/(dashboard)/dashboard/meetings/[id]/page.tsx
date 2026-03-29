import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getMeetingById, getTranscriptByMeetingId } from '@/lib/db/queries'
import { getIntegrations } from '@/app/actions/integrations'
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

  const [meeting, transcript, integrations] = await Promise.all([
    getMeetingById(id, session.user.id),
    getTranscriptByMeetingId(id),
    getIntegrations(),
  ])

  if (!meeting) notFound()

  const connectedIntegrations = integrations.map((i) => i.provider)

  return (
    <div className="space-y-6">
      <MeetingDetailHeader meeting={meeting} connectedIntegrations={connectedIntegrations} />
      <MeetingClient
        meeting={meeting}
        transcript={transcript}
        speakerMappings={meeting.speakerMappings ?? undefined}
      />
    </div>
  )
}

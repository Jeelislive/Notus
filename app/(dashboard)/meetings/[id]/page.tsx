import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMeetingById, getNoteByMeetingId, getTranscriptByMeetingId } from '@/lib/db/queries'
import { MeetingDetailHeader } from '@/components/dashboard/meeting-detail-header'
import { TranscriptPanel } from '@/components/dashboard/transcript-panel'
import { NotesPanel } from '@/components/dashboard/notes-panel'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Meeting | Notus' }
  const meeting = await getMeetingById(id, user.id)
  return { title: `${meeting?.title ?? 'Meeting'} | Notus` }
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [meeting, note, transcript] = await Promise.all([
    getMeetingById(id, user.id),
    getNoteByMeetingId(id),
    getTranscriptByMeetingId(id),
  ])

  if (!meeting) notFound()

  return (
    <div className="space-y-6 min-h-screen">
      <MeetingDetailHeader meeting={meeting} />

      {/* Split layout: transcript left, notes right */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-[600px]">
        <TranscriptPanel transcript={transcript} status={meeting.status} />
        <NotesPanel note={note} meetingId={meeting.id} status={meeting.status} />
      </div>
    </div>
  )
}

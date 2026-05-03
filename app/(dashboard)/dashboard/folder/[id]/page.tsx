import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getFolderWithMeetings } from '@/lib/db/queries'
import { FolderViewClient } from '@/components/dashboard/folder-view-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FolderPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const folder = await getFolderWithMeetings(id, session.user.id)
  if (!folder) notFound()

  return <FolderViewClient folder={folder} />
}

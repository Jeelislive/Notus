import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/notes?meeting=${id}`)
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSession } from '@/lib/session'
import { getMeetingsByUser } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { notes, profiles } from '@/lib/db/schema'
import { inArray, eq } from 'drizzle-orm'
import { NotesPageClient } from '@/components/dashboard/notes-page-client'

export const metadata: Metadata = { title: 'Notes | Notus' }

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; meeting?: string }>
}) {
  const { note: selectedNoteId } = await searchParams
  const session = await getSession()
  if (!session) redirect('/login')

  const [allMeetings, profileRows] = await Promise.all([
    getMeetingsByUser(session.user.id),
    db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1),
  ])
  const profile = profileRows[0]
  const currentUser = {
    name: profile?.fullName ?? session.user.name ?? 'Me',
    email: profile?.email ?? session.user.email ?? '',
    avatarUrl: profile?.avatarUrl ?? null,
  }

  const meetingIds = allMeetings.map((m) => m.id)

  const allNotes = meetingIds.length
    ? await db.select().from(notes).where(inArray(notes.meetingId, meetingIds))
        .orderBy(notes.createdAt)
    : []

  // Group notes by meetingId
  const notesByMeeting: Record<string, typeof allNotes> = {}
  for (const note of allNotes) {
    if (!notesByMeeting[note.meetingId]) notesByMeeting[note.meetingId] = []
    notesByMeeting[note.meetingId].push(note)
  }

  return (
    <Suspense>
      <NotesPageClient
        meetings={allMeetings}
        notesByMeeting={notesByMeeting}
        selectedNoteId={selectedNoteId ?? null}
        currentUser={currentUser}
      />
    </Suspense>
  )
}

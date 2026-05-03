import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSession } from '@/lib/session'
import { getAllMeetingsByUser, getMeetingTranslation, getUserPreferredLanguage } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { notes, profiles, userIntegrations } from '@/lib/db/schema'
import { inArray, eq, and } from 'drizzle-orm'
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

  const [allMeetings, profileRows, jiraIntegration, preferredLanguage] = await Promise.all([
    getAllMeetingsByUser(session.user.id),
    db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1),
    db.query.userIntegrations.findFirst({
      where: and(eq(userIntegrations.userId, session.user.id), eq(userIntegrations.provider, 'jira')),
    }),
    getUserPreferredLanguage(session.user.id),
  ])

  if (allMeetings.length === 0) redirect('/dashboard')

  const jiraConfig = jiraIntegration?.config
    ? (jiraIntegration.config as { domain: string; email: string; apiToken: string; projectKey: string })
    : null
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

  const notesByMeeting: Record<string, typeof allNotes> = {}
  for (const note of allNotes) {
    if (!notesByMeeting[note.meetingId]) notesByMeeting[note.meetingId] = []
    notesByMeeting[note.meetingId].push(note)
  }

  const translationsByMeeting: Record<string, { summary?: string | null; summaryStructured?: string | null; actionItems?: string | null; followUpEmail?: string | null }> = {}
  if (preferredLanguage !== 'en' && meetingIds.length > 0) {
    const translationResults = await Promise.all(
      meetingIds.map((id) => getMeetingTranslation(id, preferredLanguage))
    )
    for (let i = 0; i < meetingIds.length; i++) {
      const t = translationResults[i]
      if (t) {
        translationsByMeeting[meetingIds[i]] = {
          summary: t.summary,
          summaryStructured: t.summaryStructured,
          actionItems: t.actionItems,
          followUpEmail: t.followUpEmail,
        }
      }
    }
  }

  return (
    <Suspense>
      <NotesPageClient
        meetings={allMeetings}
        notesByMeeting={notesByMeeting}
        selectedNoteId={selectedNoteId ?? null}
        currentUser={currentUser}
        jiraConfig={jiraConfig}
        preferredLanguage={preferredLanguage}
        translationsByMeeting={translationsByMeeting}
      />
    </Suspense>
  )
}

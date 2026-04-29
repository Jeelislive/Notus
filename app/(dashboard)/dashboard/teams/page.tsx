import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getTeamsByUser } from '@/lib/db/queries'
import { CreateTeamDialog } from '@/components/dashboard/create-team-dialog'

export default async function TeamsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const teams = await getTeamsByUser(session.user.id)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Teams</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Collaborate with your team on shared meetings</p>
        </div>
        <CreateTeamDialog />
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-4">
            <Users className="size-5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1.5">No teams yet</h3>
          <p className="text-[13px] text-muted-foreground mb-5 max-w-xs mx-auto">
            Create a team to share meetings and collaborate with colleagues.
          </p>
          <CreateTeamDialog trigger="button" />
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => (
            <a
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-[#0075de]/30 hover:bg-muted/30 animate-meeting-row group"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Avatar */}
              <div className="size-11 rounded-xl bg-[#0075de]/10 border border-[#0075de]/15 flex items-center justify-center shrink-0">
                <span className="text-[17px] font-bold text-[#0075de] dark:text-[#62aef0] leading-none">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate">{team.name}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5 capitalize">{team.role}</p>
              </div>

              <svg
                className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0"
                style={{ transition: 'color 150ms ease-out' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

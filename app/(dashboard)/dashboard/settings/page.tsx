import type { Metadata } from 'next'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { Puzzle, ChevronRight } from 'lucide-react'
import { UserLanguageSelector } from '@/components/ui/user-language-selector'
import { LanguageSettings } from '@/components/settings/language-settings'

export const metadata: Metadata = { title: 'Settings | Notus' }

export default async function SettingsPage() {
  const session = await getSession()

  return (
    <div className="space-y-5 max-w-2xl h-full md:h-auto overflow-y-auto md:overflow-visible min-h-0 md:min-h-auto">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account and preferences</p>
      </div>

      <LanguageSettings 
        currentPreferredLanguage="en"
        currentTranscriptionLanguage="auto"
      />

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Account</h2>
        </div>
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[15px] text-foreground">Email</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">{session?.user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[15px] text-foreground">Plan</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Free · 300 min/month</p>
            </div>
            <span className="text-[13px] text-indigo-500 dark:text-indigo-400 font-medium">Upgrade coming soon</span>
          </div>
        </div>
      </div>

      {/* Integrations card - links to dedicated hub */}
      <Link
        href="/dashboard/integrations"
        className="flex items-center justify-between px-5 py-4 rounded-2xl border border-border bg-background hover:border-border/80 hover:shadow-sm active:scale-[0.99] transition-all duration-150 group"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Puzzle className="size-4 text-indigo-500" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[15px] font-medium text-foreground">Integrations</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">Connect Jira, Slack, Notion, Linear and more</p>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </div>
  )
}

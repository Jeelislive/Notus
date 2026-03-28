import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { JiraSettings } from './jira-settings'

export const metadata: Metadata = { title: 'Settings | Notus' }

export default async function SettingsPage() {
  const session = await getSession()

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account</p>
      </div>

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

      <JiraSettings />
    </div>
  )
}

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings | Notus' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800/60">
            <div>
              <p className="text-sm text-zinc-300">Email</p>
              <p className="text-xs text-zinc-600 mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-zinc-300">Plan</p>
              <p className="text-xs text-zinc-600 mt-0.5">Free · 300 min/month</p>
            </div>
            <span className="text-xs text-indigo-400 font-medium">Upgrade coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}

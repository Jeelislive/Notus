'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarNavProps {
  user: { email: string; name: string }
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Meetings', icon: LayoutDashboard },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d0d0f] border-r border-white/[0.05] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.05]">
        <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg className="size-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <span className="font-bold text-zinc-100 text-[15px]">Notus</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all',
                active
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-white/[0.05]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group">
          <div className="size-7 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-indigo-400">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{user.name || 'Account'}</p>
            <p className="text-[11px] text-zinc-600 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

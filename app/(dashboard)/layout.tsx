import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav user={{ email: session.user.email, name: session.user.name ?? '' }} />
      <main className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col" style={{ paddingLeft: 'var(--sidebar-width, 256px)', transition: 'padding-left 240ms cubic-bezier(0.23,1,0.32,1)' }}>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

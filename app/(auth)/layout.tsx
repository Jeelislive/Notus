import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    template: '%s | Notus',
    default: 'Notus',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 group active:scale-[0.97]" style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)' }}>
          <div className="size-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#6366f1', transition: 'background-color 150ms ease-out' }}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0"    y="5"   width="2.5" height="4"  rx="1.25" fill="white" fillOpacity="0.5"/>
              <rect x="3.5"  y="2"   width="2.5" height="10" rx="1.25" fill="white"/>
              <rect x="7"    y="3.5" width="2.5" height="7"  rx="1.25" fill="white" fillOpacity="0.75"/>
              <rect x="10.5" y="0"   width="2.5" height="14" rx="1.25" fill="white"/>
              <rect x="14"   y="4.5" width="2.5" height="5"  rx="1.25" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground">Notus</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Notus. </span>
        <Link href="/privacy" className="hover:text-foreground" style={{ transition: 'color 150ms ease-out' }}>Privacy Policy</Link>
        <span> · </span>
        <Link href="/terms" className="hover:text-foreground" style={{ transition: 'color 150ms ease-out' }}>Terms of Service</Link>
      </footer>
    </div>
  )
}

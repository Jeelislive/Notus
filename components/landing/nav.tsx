'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-5 pt-5">
        <div
          className={`flex h-12 items-center justify-between rounded-2xl px-4 ${
            scrolled
              ? 'bg-background/90 backdrop-blur-xl border border-border shadow-xl shadow-black/5 dark:shadow-black/30'
              : 'bg-transparent'
          }`}
          style={{ transition: 'background-color 300ms cubic-bezier(0.23,1,0.32,1), border-color 300ms cubic-bezier(0.23,1,0.32,1), box-shadow 300ms cubic-bezier(0.23,1,0.32,1)' }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#6366f1', transition: 'background-color 150ms ease-out' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6366f1')}
            >
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0"  y="5" width="2.5" height="4"  rx="1.25" fill="white" fillOpacity="0.5"/>
                <rect x="3.5" y="2" width="2.5" height="10" rx="1.25" fill="white"/>
                <rect x="7"  y="3.5" width="2.5" height="7" rx="1.25" fill="white" fillOpacity="0.75"/>
                <rect x="10.5" y="0" width="2.5" height="14" rx="1.25" fill="white"/>
                <rect x="14" y="4.5" width="2.5" height="5" rx="1.25" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-foreground tracking-tight">Notus</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="px-3 py-1.5 text-sm text-muted-foreground rounded-lg"
                style={{ transition: 'color 150ms ease-out, background-color 150ms ease-out' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.backgroundColor = 'var(--muted)' }}
                onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.backgroundColor = '' }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeSwitcher />
            <div className="w-px h-4 bg-border mx-1" />
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm text-muted-foreground rounded-lg"
              style={{ transition: 'color 150ms ease-out, background-color 150ms ease-out' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-lg shadow-indigo-500/20
                active:scale-[0.97]"
              style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}
            >
              Start free
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeSwitcher />
            <button
              className="p-2 text-muted-foreground rounded-lg active:scale-[0.95]"
              style={{ transition: 'color 150ms ease-out, background-color 150ms ease-out, transform 120ms cubic-bezier(0.23,1,0.32,1)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden mt-2 rounded-2xl bg-background/95 backdrop-blur-xl border border-border p-3 shadow-2xl animate-fade-up">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="block px-3 py-2.5 text-sm text-muted-foreground rounded-xl"
                style={{ transition: 'color 150ms ease-out, background-color 150ms ease-out' }}
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="mt-2 pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" className="text-center py-2.5 text-sm text-foreground rounded-xl"
                style={{ transition: 'background-color 150ms ease-out' }}>Sign in</Link>
              <Link href="/signup" className="text-center py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl active:scale-[0.97]"
                style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}>Start free</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

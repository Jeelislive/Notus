'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

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
      <div className="max-w-6xl mx-auto px-5 pt-5">
        {/* Pill-shaped nav container — inspired by Granola */}
        <div
          className={`flex h-12 items-center justify-between rounded-2xl px-4 transition-all duration-500 ${
            scrolled
              ? 'bg-[#111113]/90 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/30'
              : 'bg-transparent'
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center transition-all group-hover:bg-indigo-500 shadow-lg shadow-indigo-500/30">
              <svg className="size-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">Notus</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-all"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-all"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ml-1 px-4 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              Start free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden mt-2 rounded-2xl bg-[#111113]/95 backdrop-blur-xl border border-white/[0.06] p-3 shadow-2xl">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="block px-3 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-xl transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="mt-2 pt-2 border-t border-white/[0.05] flex flex-col gap-2">
              <Link href="/login" className="text-center py-2.5 text-sm text-zinc-300 hover:bg-white/5 rounded-xl transition-all">Sign in</Link>
              <Link href="/signup" className="text-center py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">Start free</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

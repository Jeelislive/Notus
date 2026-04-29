'use client'

import Link from 'next/link'

const nav = {
  PRODUCT: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
    { label: 'Newsletter', href: '#' },
  ],
  COMPANY: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#', badge: "We're hiring" },
    { label: 'Contact us', href: '#' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
  RESOURCES: [
    { label: 'Sign in', href: '/login' },
    { label: 'Documentation', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Security', href: '#' },
    { label: 'Help Center', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">

      {/* Main footer links */}
      <div className="max-w-7xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">

          {/* Logo column */}
          <div className="col-span-2 sm:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="size-6 rounded-lg bg-[#0075de] flex items-center justify-center">
                <svg className="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">Notus</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
              The AI notepad for people in back-to-back meetings.
            </p>
          </div>

          {/* Nav columns */}
          {Object.entries(nav).map(([section, links]) => (
            <div key={section}>
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-4">
                {section}
              </p>
              <ul className="space-y-3">
                {links.map(({ label, href, badge }: { label: string; href: string; badge?: string }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground
                        transition-colors duration-150"
                    >
                      {label}
                      {badge && (
                        <span className="text-[9px] font-semibold text-[#0075de] bg-[#0075de]/10 border border-[#0075de]/20 rounded-full px-2 py-0.5">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left: Logo + tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-5 rounded-md bg-[#0075de] flex items-center justify-center">
                <svg className="size-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-foreground">Notus</span>
            </Link>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="text-xs text-muted-foreground/50">
              Join the 4,900+ teams using Notus, today.
            </span>
          </div>

          {/* Right: Newsletter */}
          <form className="flex items-center gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Email address"
              className="h-8 w-44 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-1 focus:ring-[#097fe8]/50 focus:border-[#0075de]/50
                transition-colors duration-150"
            />
            <button
              type="submit"
              className="h-8 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 text-xs font-medium text-foreground
                transition-colors duration-150 ease-out active:scale-[0.97]"
            >
              Get updates
            </button>
          </form>

        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground/40">
            © {new Date().getFullYear()} Notus. A fully editable SaaS template.
          </p>
          {/* Social icons */}
          <div className="flex items-center gap-3">
            {['Twitter', 'GitHub', 'LinkedIn'].map((s) => (
              <a key={s} href="#" aria-label={s} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-150 text-xs">
                {s[0]}
              </a>
            ))}
          </div>
        </div>
      </div>

    </footer>
  )
}

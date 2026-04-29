'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'

export function CTABanner() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    )
    ref.current?.querySelectorAll('.section-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-28 px-5 border-t border-border" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <div className="section-reveal relative rounded-3xl border border-border bg-muted/20 overflow-hidden">

          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#0075de]/25 to-transparent" />

          {/* Background glow */}
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#0075de]/[0.05] blur-[80px] rounded-full pointer-events-none"
          />

          <div className="relative px-8 py-20 text-center">

            {/* Label */}
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-8">
              <span className="size-1.5 rounded-full bg-[#0075de] inline-block" />
              Start with Notus
            </p>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-4">
              Start for free today.
            </h2>

            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Ready for calmer, more productive meetings? Try Notus for a few meetings today.
            </p>

            {/* Checkmarks */}
            <div className="flex flex-wrap items-center justify-center gap-5 mb-10">
              {['Try 30 days', "It's free", 'No credit card'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="size-3.5 text-[#0075de]" strokeWidth={2.5} />
                  {item}
                </span>
              ))}
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-foreground text-background font-semibold rounded-full px-8 py-3.5 text-sm shadow-sm
                hover:scale-[1.02] active:scale-[0.97]"
              style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)' }}
            >
              <Sparkles className="size-3.5" />
              Get started free
            </Link>
          </div>

          {/* Bottom decoration */}
          <div className="border-t border-border px-8 py-5 flex flex-wrap items-center justify-center gap-8">
            {[
              { label: 'PostHog', slug: 'posthog' },
              { label: 'Linear',  slug: 'linear'  },
              { label: 'Vercel',  slug: 'vercel'  },
              { label: 'Replit',  slug: 'replit'  },
            ].map(({ label, slug }) => (
              <img
                key={slug}
                src={`https://raw.githubusercontent.com/gilbarbara/logos/main/logos/${slug}.svg`}
                alt={label}
                className="h-5 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-200
                  dark:brightness-0 dark:invert"
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

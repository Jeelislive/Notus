'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check, Zap } from 'lucide-react'

const FREE_FEATURES = [
  '60 minutes of recording/month',
  'Live transcription',
  'Basic notes editor',
  '1 folder',
]

const PRO_FEATURES = [
  'Unlimited recording minutes',
  'AI notes, summary & action items',
  'Follow-up email generation',
  'Unlimited folders',
  'Language translation',
  'Chat assistant per meeting',
]

export function Pricing() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.08 }
    )
    ref.current?.querySelectorAll('.section-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" className="py-28 px-5 border-t border-border" ref={ref}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="section-reveal text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-4">
            Simple, honest pricing.
            <br />
            <span className="text-[#0075de]">Start free.</span>
          </h2>
          <p className="text-muted-foreground text-lg">No credit card required to get started.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Free */}
          <div className="section-reveal flex flex-col rounded-2xl border border-border bg-background p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Free</h3>
            <p className="text-xs text-muted-foreground mb-5">Try Notus at no cost</p>
            <div className="mb-5 pb-5 border-b border-border">
              <span className="text-3xl font-bold text-foreground">₹0</span>
              <span className="text-muted-foreground text-sm ml-1">/mo</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/50" strokeWidth={2.5} />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full text-center py-2.5 rounded text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border transition-transform duration-[160ms] ease-out active:scale-[0.97]"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="section-reveal flex flex-col rounded-2xl border border-[#0075de]/25 bg-background shadow-xl shadow-[#0075de]/[0.06] p-6 relative" style={{ transitionDelay: '60ms' }}>
            <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#0075de]/40 to-transparent" />
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-3.5 text-[#0075de]" />
              <h3 className="text-base font-semibold text-foreground">Pro</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">For professionals in back-to-back meetings</p>
            <div className="mb-5 pb-5 border-b border-border">
              <span className="text-3xl font-bold text-foreground">₹999</span>
              <span className="text-muted-foreground text-sm ml-1">/mo</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="size-3.5 shrink-0 mt-0.5 text-[#0075de]" strokeWidth={2.5} />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup?plan=pro"
              className="w-full text-center py-2.5 rounded text-sm font-semibold bg-[#0075de] hover:bg-[#005bab] text-white transition-transform duration-[160ms] ease-out active:scale-[0.97]"
            >
              Upgrade to Pro
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

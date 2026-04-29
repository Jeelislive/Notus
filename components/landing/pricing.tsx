'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    href: '/signup',
    description: 'Try Notus for a few meetings',
    features: ['300 minutes per month', 'AI summaries & action items', '7-day meeting history', 'Basic search'],
    cta: 'Start for free',
    featured: false,
    footnote: 'Learn about the Notus platform and core features.',
  },
  {
    name: 'Pro',
    href: '/signup?plan=pro',
    description: 'For professionals in back-to-back meetings',
    features: ['Unlimited minutes', 'Human-like summaries', 'Unlimited history', 'Semantic search', 'CRM & Slack integrations', 'Priority support'],
    cta: 'Start Pro trial',
    featured: true,
    price: '$12/mo',
    footnote: null,
  },
  {
    name: 'Enterprise',
    href: '/contact',
    description: 'For larger teams and custom needs',
    features: ['Everything in Pro', 'SSO & advanced security', 'Custom integrations', 'Dedicated support', 'SLA guarantees'],
    cta: 'Get a quote',
    featured: false,
    footnote: 'See our standard pricing and get a customized quote.',
  },
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
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="section-reveal text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-4">
            A plan for anyone.
            <br />
            <span className="text-[#0075de]">Anytime.</span>
          </h2>
          <p className="text-muted-foreground text-lg">Start free. No credit card required.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`section-reveal flex flex-col rounded-2xl border p-6 transition-shadow duration-300 ease-out
                ${plan.featured
                  ? 'border-[#0075de]/25 bg-background shadow-xl shadow-[#0075de]/[0.06] relative'
                  : 'border-border bg-background hover:shadow-md hover:shadow-black/[0.03]'
                }`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {plan.featured && (
                <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#0075de]/40 to-transparent" />
              )}

              {/* Plan header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{plan.description}</p>
                </div>
                <Link
                  href={plan.href}
                  aria-label={`Get started with ${plan.name}`}
                  className={`shrink-0 flex items-center justify-center size-7 rounded-full border
                    transition-colors duration-150 ease-out
                    ${plan.featured
                      ? 'border-[#0075de]/30 bg-[#0075de]/8 hover:bg-[#0075de]/15 text-[#0075de]'
                      : 'border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {/* Price (Pro only) */}
              {plan.price && (
                <div className="mb-5 pb-5 border-b border-border">
                  <span className="text-3xl font-bold text-foreground">{plan.price.split('/')[0]}</span>
                  <span className="text-muted-foreground text-sm ml-1">/{plan.price.split('/')[1]}</span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`size-3.5 shrink-0 mt-0.5 ${plan.featured ? 'text-[#0075de]' : 'text-muted-foreground/50'}`}
                      strokeWidth={2.5}
                    />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.footnote && (
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{plan.footnote}</p>
              )}

              <Link
                href={plan.href}
                className={`w-full text-center py-2.5 rounded text-sm font-semibold
                  transition-transform duration-[160ms] ease-out active:scale-[0.97]
                  ${plan.featured
                    ? 'bg-[#0075de] hover:bg-[#005bab] text-white'
                    : 'bg-muted/50 hover:bg-muted text-foreground border border-border'
                  }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

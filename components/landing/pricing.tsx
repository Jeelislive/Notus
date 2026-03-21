'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For individuals trying Notus.',
    cta: 'Start for free',
    href: '/signup',
    featured: false,
    features: ['300 minutes/month', 'AI summaries & action items', 'Full-text search', '5 meeting templates', 'Public share links', 'Email export'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For professionals who live in meetings.',
    cta: 'Start Pro trial',
    href: '/signup',
    featured: true,
    features: ['Unlimited recording', 'AI chat with transcripts', 'Follow-up email drafts', 'Google Calendar sync', 'Slack & Notion export', 'Custom AI prompts', 'Priority support'],
  },
  {
    name: 'Team',
    price: '$49',
    period: '/mo',
    description: 'For teams that meet and collaborate.',
    cta: 'Start team trial',
    href: '/signup',
    featured: false,
    features: ['Everything in Pro', 'Up to 10 members', 'Shared meeting library', 'Team templates', 'Admin dashboard', 'Usage analytics'],
  },
]

export function Pricing() {
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
    <section id="pricing" className="py-32 px-5 border-t border-white/[0.04]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="section-reveal max-w-xl mb-20">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-[0.15em] mb-4">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-zinc-400 text-lg">Start free. No card required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`section-reveal relative flex flex-col rounded-2xl p-7 transition-all ${
                plan.featured
                  ? 'bg-[#111113] border border-indigo-500/30 shadow-2xl shadow-indigo-500/10'
                  : 'bg-[#0e0e10] border border-white/[0.06] hover:border-white/[0.10]'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {plan.featured && (
                <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
              )}
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest bg-indigo-600 text-white px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-zinc-400 mb-3">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-zinc-500 text-sm">{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className={`size-3.5 shrink-0 ${plan.featured ? 'text-indigo-400' : 'text-zinc-600'}`} strokeWidth={2.5} />
                    <span className="text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  plan.featured
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/[0.04] hover:bg-white/[0.07] text-zinc-300 border border-white/[0.08]'
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

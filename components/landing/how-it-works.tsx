'use client'

import { useEffect, useRef } from 'react'

const steps = [
  {
    number: '01',
    title: 'Invite Notus',
    description: 'Connect your calendar or invite Notus to your meeting link. It joins quietly as a participant and starts transcribing instantly.',
    detail: 'Works with Zoom, Meet, and Teams',
  },
  {
    number: '02',
    title: 'Have the conversation',
    description: 'Stop worrying about taking notes. Focus entirely on the discussion, the people, and the decisions being made.',
    detail: 'Speaker diarization included',
  },
  {
    number: '03',
    title: 'Get perfect notes',
    description: 'Minutes after the call, receive a structured summary, explicit action items, and a ready-to-send follow-up email.',
    detail: 'Syncs to CRM and Slack automatically',
  },
]

export function HowItWorks() {
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
    <section id="how-it-works" className="py-32 px-5 border-t border-border" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="section-reveal max-w-xl mb-20">
          <p className="text-xs font-semibold text-[#0075de] uppercase tracking-[0.15em] mb-4">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Three steps. Zero friction.
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="section-reveal grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-6 lg:gap-12 py-10 border-t border-border first:border-t-0 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Step number */}
              <div className="flex items-start lg:justify-end pt-1">
                <span className="text-5xl font-bold text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors font-mono tabular-nums">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="space-y-3 max-w-xl">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{step.description}</p>
                <div className="inline-flex items-center gap-2">
                  <div className="size-1 rounded-full bg-[#0075de]" />
                  <span className="text-sm text-muted-foreground">{step.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

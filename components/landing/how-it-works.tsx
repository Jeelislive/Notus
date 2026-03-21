'use client'

import { useEffect, useRef } from 'react'

const steps = [
  {
    number: '01',
    title: 'Hit record',
    description: 'One click starts recording. Capture your browser tab (Chrome) or microphone. No extensions, no bots invited to your call.',
    detail: 'Works with Zoom, Meet, Teams, or any tab',
  },
  {
    number: '02',
    title: 'AI works in the background',
    description: 'Deepgram transcribes in real time with speaker detection. Claude AI structures your notes as the conversation happens.',
    detail: 'Zero effort required from you',
  },
  {
    number: '03',
    title: 'Notes ready instantly',
    description: 'When you stop recording, your meeting has a summary, action items, key decisions, and a draft follow-up email — ready to share.',
    detail: 'Usually under 30 seconds',
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
    <section id="how-it-works" className="py-32 px-5 border-t border-white/[0.04]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="section-reveal max-w-xl mb-20">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-[0.15em] mb-4">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Three steps. Zero friction.
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="section-reveal grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-6 lg:gap-12 py-10 border-t border-white/[0.04] first:border-t-0 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Step number */}
              <div className="flex items-start lg:justify-end pt-1">
                <span className="text-5xl font-bold text-white/[0.06] group-hover:text-white/[0.1] transition-colors font-mono tabular-nums">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="space-y-3 max-w-xl">
                <h3 className="text-2xl font-bold text-white tracking-tight">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-[15px]">{step.description}</p>
                <div className="inline-flex items-center gap-2">
                  <div className="size-1 rounded-full bg-indigo-500" />
                  <span className="text-sm text-zinc-600">{step.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

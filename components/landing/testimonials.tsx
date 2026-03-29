'use client'

import { useEffect, useRef } from 'react'

const testimonials = [
  {
    quote: "Notus has become indispensable - feels like I'm living in the future.",
    name: 'John Borthwick',
    title: 'Investor, Betaworks',
    bg: 'bg-indigo-100 dark:bg-indigo-950/30',
    initial: 'J',
    color: 'bg-indigo-500',
  },
  {
    quote: "The addiction is real - at this point I can't imagine life without it. Effortlessly powerful.",
    name: 'Adriana Vitagliano',
    title: 'VC, Firstminute Capital',
    bg: 'bg-violet-100 dark:bg-violet-950/30',
    initial: 'A',
    color: 'bg-violet-500',
  },
  {
    quote: "I stopped taking notes the day I started using Notus. Now I actually listen in meetings.",
    name: 'Marcus Reid',
    title: 'Engineering Lead, Ramp',
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    initial: 'M',
    color: 'bg-emerald-500',
  },
]

export function Testimonials() {
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
    <section className="py-28 px-5 border-t border-border" ref={ref}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="section-reveal mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
            Notus is the meeting<br />intelligence people love
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map(({ quote, name, title, bg, initial, color }, i) => (
            <div
              key={name}
              className={`section-reveal rounded-2xl border border-border overflow-hidden ${bg}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Avatar area */}
              <div className="px-6 pt-6 pb-4">
                <div className={`size-12 rounded-full ${color} flex items-center justify-center mb-4`}>
                  <span className="text-lg font-bold text-white">{initial}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{title}</span>
              </div>

              {/* Quote */}
              <div className="px-6 pb-6">
                <p className="text-sm text-foreground/80 leading-relaxed">&ldquo;{quote}&rdquo;</p>
              </div>

              {/* Rating dots */}
              <div className="px-6 pb-5 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="size-1.5 rounded-full bg-foreground/20" />
                ))}
                <span className="text-[10px] text-muted-foreground ml-2">4.9 / 5</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

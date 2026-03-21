'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
    <section className="py-32 px-5 border-t border-white/[0.04]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="section-reveal relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0e0e10] p-16 text-center">
          {/* Top border line */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-indigo-600/[0.07] blur-[80px] rounded-full pointer-events-none" />

          <div className="relative space-y-6">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Your next meeting
              <br />
              <span className="text-gradient">deserves better notes.</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto">
              Join professionals who stopped taking notes and started having better conversations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-7 py-3.5 transition-all shadow-xl shadow-indigo-500/25 hover:-translate-y-px"
              >
                Get started free
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <p className="text-xs text-zinc-700">No credit card required · 300 minutes free · Cancel anytime</p>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-28 pb-0 px-5 overflow-hidden">
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-background"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-[#0075de]/[0.06] blur-[100px]" />
      </div>


      {/* Illustration - left side at CTA level, light mode only */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[260px] top-[450px] hidden xl:block dark:hidden animate-fade-in"
        style={{ animationDelay: '200ms' }}
      >
        <Image
          src="/hero.svg"
          alt=""
          width={210}
          height={210}
          priority
          className="select-none"
        />
      </div>

      <div className="max-w-7xl mx-auto text-center">

        {/* Pill badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 mb-10 shadow-sm">
          <span className="size-2 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground font-medium">Now in beta · Join 4,900+ teams</span>
          <ArrowRight className="size-3.5 text-muted-foreground/60" />
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 text-6xl sm:text-7xl lg:text-[88px] font-bold text-foreground leading-[1.04] tracking-[-0.03em] mb-7">
          The AI notepad for{' '}
          <br className="hidden sm:block" />
          <span className="text-[#0075de]">back-to-back</span>{' '}
          meetings
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-200 text-xl sm:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
          Notus transcribes your meetings and turns raw notes into structured
          summaries, action items, and follow-up emails - automatically.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 flex flex-wrap items-center justify-center gap-4 mb-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#0075de] text-white font-semibold rounded px-8 py-3 text-base active:scale-[0.9]"
            style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#005bab')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0075de')}
          >
            <Sparkles className="size-4" />
            Get started free
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium px-8 py-3 rounded
              border border-border hover:border-border hover:bg-muted text-base"
            style={{ transition: 'color 150ms ease-out, background-color 150ms ease-out' }}
          >
            See how it works
          </Link>
        </div>

        <p className="animate-fade-up delay-400 text-sm text-muted-foreground/50 mb-16">
          Free to start · 300 minutes/month · No credit card required
        </p>

        {/* ─── Product UI Mockup ─── */}
        <div className="animate-fade-up delay-400 relative">
          <div className="relative rounded-t-2xl overflow-hidden border border-b-0 border-border bg-background shadow-2xl shadow-black/[0.08] dark:shadow-black/50">

            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="size-2.5 rounded-full bg-[#febc2e]" />
                  <div className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="h-5 w-52 rounded-md bg-muted/60 flex items-center px-2.5">
                  <span className="text-[10px] text-muted-foreground/60">notus.app · Q2 Planning Sync</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-red-500 animate-rec" />
                <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Rec</span>
              </div>
            </div>

            {/* Three-panel content */}
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-border min-h-[300px] text-left">

              {/* Panel 1: Live Transcript */}
              <div className="p-5 bg-muted/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Live Transcript</span>
                  <span className="text-xs text-muted-foreground tabular-nums">24:33</span>
                </div>

                {[
                  { s: 'Alex M.', c: 'text-[#0075de]', t: '23:04', msg: "The caching layer is top priority - we need it before Q3, non-negotiable." },
                  { s: 'Sarah K.', c: 'text-violet-500', t: '23:22', msg: "Redis at the edge cuts p99 from 2.3s to under 200ms. I can have a POC Thursday." },
                  { s: 'Mike R.', c: 'text-emerald-500', t: '23:48', msg: "Agreed. We should also update the API SLA docs while we're at it." },
                  { s: 'Alex M.', c: 'text-[#0075de]', t: '24:10', msg: "Good call. Sarah, can you own that? Aim for Friday?" },
                ].map((l, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${l.c}`}>{l.s}</span>
                      <span className="text-xs text-muted-foreground/60">{l.t}</span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed">{l.msg}</p>
                  </div>
                ))}

                {/* Live typing */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-sky-500">Sarah K.</span>
                    <span className="text-xs text-muted-foreground/60">24:32</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <p className="text-xs text-foreground/60">Yes, will have it done by Fri</p>
                    <span className="inline-block w-px h-3 bg-foreground/40 animate-blink ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Panel 2: AI Notes */}
              <div className="hidden sm:block p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">AI Notes</span>
                  <span className="text-xs text-[#0075de] font-medium">✦ Generating</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Q2 planning sync. Team agreed to prioritize Redis caching over mobile launch. Targeting ship before June 1.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Decisions</p>
                  {[
                    'Ship Redis caching layer before June 1',
                    'Delay mobile launch to Q3',
                    'Update API SLA documentation',
                  ].map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 size-3.5 rounded-sm border border-[#0075de]/25 bg-[#0075de]/10 flex items-center justify-center shrink-0">
                        <div className="size-1.5 rounded-full bg-[#0075de]" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight">{d}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action Items</p>
                  {[
                    { t: 'Redis caching POC', o: 'Mike R.', d: 'Thu' },
                    { t: 'Update SLA docs', o: 'Sarah K.', d: 'Fri' },
                    { t: 'Schedule infra review', o: 'Alex M.', d: 'Mon' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="size-3 rounded-sm border border-border shrink-0" />
                        <span className="text-xs text-foreground/70 truncate">{item.t}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{item.o}</span>
                        <span className="text-xs text-[#0075de] font-medium">{item.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 3: Ask Notus (AI Chat) */}
              <div className="hidden sm:block p-5 space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Ask Notus</span>
                  <div className="size-4 rounded-full bg-[#0075de]/10 flex items-center justify-center">
                    <div className="size-2 rounded-full bg-[#0075de]" />
                  </div>
                </div>

                {[
                  { role: 'user', text: 'Write a follow-up email for this meeting' },
                  { role: 'ai', text: 'Hi team,\n\nKey outcomes from today:\n• Redis POC - Mike by Thu\n• SLA docs - Sarah by Fri\n• Mobile moved to Q3\n\nBest,\nAlex' },
                  { role: 'user', text: 'What did we decide about mobile?' },
                  { role: 'ai', text: 'Mobile was pushed to Q3 to prioritize the caching layer before June 1.' },
                ].map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                    <div className={`max-w-[88%] px-3 py-1.5 text-xs leading-relaxed whitespace-pre-line rounded-xl ${
                      m.role === 'user'
                        ? 'bg-[#0075de] text-white rounded-br-none'
                        : 'bg-muted/60 text-foreground/80 border border-border/40 rounded-bl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Fade to background at bottom */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"
          />

        </div>
      </div>
    </section>
  )
}

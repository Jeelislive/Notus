import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen bg-mesh overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 xl:gap-20 items-center min-h-[calc(100vh-128px)]">

          {/* LEFT: Text */}
          <div className="space-y-7 max-w-xl">
            {/* Pill badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
              <span className="size-1.5 rounded-full bg-indigo-400 animate-rec" />
              <span className="text-xs text-zinc-400 font-medium">Real-time AI transcription</span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up delay-100">
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-[1.08] tracking-tight">
                Stop taking notes.{' '}
                <span className="text-gradient">Start having</span>{' '}
                better meetings.
              </h1>
            </div>

            {/* Subtext */}
            <p className="animate-fade-up delay-200 text-base sm:text-lg text-zinc-400 leading-relaxed">
              Notus records, transcribes, and turns your meetings into structured notes with
              summaries, action items, and follow-up emails — automatically.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up delay-300 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-px"
              >
                Start for free
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-white font-medium px-5 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all text-sm"
              >
                See how it works
              </a>
            </div>

            <p className="animate-fade-up delay-400 text-xs text-zinc-600">
              Free plan · 300 min/month · No credit card required
            </p>
          </div>

          {/* RIGHT: Product UI mockup */}
          <div className="animate-slide-right delay-200 relative hidden lg:block">
            <div className="animate-float">
              {/* App window */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111113] shadow-2xl shadow-black/60 text-left">

                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d0d0f]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="size-2.5 rounded-full bg-[#febc2e]" />
                      <div className="size-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-[11px] text-zinc-500">Product Roadmap Review · notus.app</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1">
                    <span className="size-1.5 rounded-full bg-red-400 animate-rec" />
                    <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">Rec</span>
                  </div>
                </div>

                {/* Split pane */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.05]">

                  {/* Transcript panel */}
                  <div className="p-4 space-y-3 bg-[#0c0c0e] min-h-[340px]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Live Transcript</span>
                      <span className="text-[10px] text-zinc-600 tabular-nums">34:12</span>
                    </div>

                    {[
                      { speaker: 'Alex M.', color: 'text-indigo-400', time: '33:04', text: "The main concern is API latency — we're seeing p99 at 2.3s which is above our SLA." },
                      { speaker: 'Sarah K.', color: 'text-violet-400', time: '33:18', text: 'Agreed. Redis caching at the edge could cut that to under 200ms.' },
                      { speaker: 'Alex M.', color: 'text-indigo-400', time: '33:41', text: "Let's assign that to Marcus. Can you own the infra spike by Friday?" },
                      { speaker: 'Mike R.', color: 'text-emerald-400', time: '33:55', text: "On it. POC ready by Thursday EOD." },
                    ].map((line, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold ${line.color}`}>{line.speaker}</span>
                          <span className="text-[10px] text-zinc-700 tabular-nums">{line.time}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{line.text}</p>
                      </div>
                    ))}

                    {/* Live typing line */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-sky-400">Sarah K.</span>
                        <span className="text-[10px] text-zinc-700">34:10</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <p className="text-[11px] text-zinc-200">Timeline looks good</p>
                        <span className="inline-block w-px h-3 bg-zinc-200" style={{ animation: 'pulseRec 1s step-end infinite' }} />
                      </div>
                    </div>
                  </div>

                  {/* AI Notes panel */}
                  <div className="p-4 space-y-4 bg-[#111113] min-h-[340px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">AI Notes</span>
                      <span className="text-[10px] text-indigo-400 font-medium">✦ Live</span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-zinc-400">Summary</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Team reviewed Q2 roadmap. Key blocker: API latency at p99 2.3s. Redis caching proposed as fix.</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-zinc-400">Decisions</p>
                      {['Ship caching layer before June 1', 'Delay mobile to Q3'].map((d, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="mt-0.5 size-3 rounded-sm border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <div className="size-1 rounded-full bg-indigo-400" />
                          </div>
                          <p className="text-[11px] text-zinc-400">{d}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-zinc-400">Action Items</p>
                      {[
                        { task: 'Redis caching POC', owner: 'Marcus', due: 'Thu' },
                        { task: 'Update API SLAs doc', owner: 'Sarah', due: 'Fri' },
                        { task: 'Schedule infra review', owner: 'Alex', due: 'Mon' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-3 rounded-sm border border-zinc-700 shrink-0" />
                            <span className="text-[10px] text-zinc-300 truncate">{item.task}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[9px] text-zinc-600">{item.owner}</span>
                            <span className="text-[9px] text-indigo-400/70 font-medium">{item.due}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle glow */}
            <div className="absolute -inset-8 -z-10 bg-indigo-600/[0.04] blur-3xl rounded-full pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
        <div className="w-px h-8 bg-gradient-to-b from-zinc-500 to-transparent" />
      </div>
    </section>
  )
}

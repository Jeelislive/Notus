'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Mic, Sparkles, MessageSquare, ArrowRight, Zap, Globe, Lock, Search, Clock, Share2, Video, CheckCircle2, CalendarDays, LayoutDashboard, FileText, Users, Settings } from 'lucide-react'

/* ─── Mini UI Previews for Feature Cards ─── */

function TranscriptPreview() {
  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-left">
      {[
        { s: 'Alex M.', c: 'text-indigo-600', msg: '"Ship caching before Q3."' },
        { s: 'Sarah K.', c: 'text-violet-500', msg: '"Redis POC ready Thursday."' },
        { s: 'Mike R.', c: 'text-emerald-500', msg: '"SLA docs by Friday."' },
      ].map((l, i) => (
        <div key={i} className="space-y-0.5">
          <span className={`text-xs font-semibold ${l.c}`}>{l.s}</span>
          <p className="text-xs text-muted-foreground">{l.msg}</p>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-0.5">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs text-indigo-600 font-medium">● Live</span>
      </div>
    </div>
  )
}

function NotesPreview() {
  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-left">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-indigo-600 font-semibold">✦ Summary</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">Team agreed to prioritize caching over mobile launch.</p>
      <div className="space-y-2">
        {['Ship caching by June 1', 'Delay mobile to Q3'].map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-3 rounded-sm border border-indigo-600/30 bg-indigo-600/10 flex items-center justify-center shrink-0">
              <div className="size-1.5 rounded-full bg-indigo-600" />
            </div>
            <span className="text-xs text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatPreview() {
  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-left">
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-xl rounded-br-none max-w-[80%]">
          Write a follow-up email
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-muted/60 border border-border/40 text-xs text-foreground/80 px-3 py-1.5 rounded-xl rounded-bl-none max-w-[90%] leading-relaxed">
          Hi team, key outcomes from today&apos;s sync...
        </div>
      </div>
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-xl rounded-br-none max-w-[80%]">
          What was decided about mobile?
        </div>
      </div>
    </div>
  )
}

const featureCards = [
  {
    Icon: Mic,
    title: 'Real-time transcription',
    description: 'Speaker-aware transcription from your first word. Works across Zoom, Meet, and Teams without bots.',
    Preview: TranscriptPreview,
  },
  {
    Icon: Sparkles,
    title: 'AI-powered notes',
    description: 'Structured summaries, decisions, and action items - generated the moment your meeting ends.',
    Preview: NotesPreview,
  },
  {
    Icon: MessageSquare,
    title: 'Chat with your meetings',
    description: "Ask anything about any meeting, past or present. Notus already knows what you're working on.",
    Preview: ChatPreview,
  },
]

const splitFeature1 = [
  { Icon: Zap, title: 'Instant capture', desc: 'Zero setup. Join your meeting and transcription starts automatically.' },
  { Icon: Globe, title: 'Works everywhere', desc: 'Zoom, Google Meet, Microsoft Teams, Webex, and phone calls.' },
  { Icon: Clock, title: 'Speaker diarization', desc: 'Knows who said what, even in rooms with multiple voices.' },
  { Icon: Search, title: 'Semantic search', desc: 'Find any decision from any meeting just by describing it.' },
]

const splitFeature2 = [
  { Icon: Sparkles, title: 'Human-like summaries', desc: 'Notes that read like a human wrote them - not robotic bullet dumps.' },
  { Icon: Share2, title: 'Instant follow-ups', desc: 'Follow-up emails drafted and ready before you close your laptop.' },
  { Icon: Lock, title: 'Private by design', desc: 'Encrypted at rest and in transit. We never train on your meetings.' },
  { Icon: MessageSquare, title: 'AI that knows context', desc: 'Chat taps your entire meeting history, not just the current call.' },
]

function DashboardPreview() {
  const meetings = [
    { title: 'Q2 Planning Sync',      date: 'Mar 28', duration: '48:12', type: '1-on-1',      status: 'Done',       statusColor: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { title: 'Product Roadmap Review', date: 'Mar 27', duration: '32:05', type: 'Team Meeting', status: 'Done',       statusColor: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { title: 'Customer Discovery',     date: 'Mar 27', duration: '28:41', type: 'Interview',    status: 'Done',       statusColor: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { title: 'Engineering Standup',    date: 'Mar 26', duration: '12:30', type: 'Standup',      status: 'Processing', statusColor: 'text-amber-500',                         dot: 'bg-amber-400' },
    { title: 'Sales Call - Acme Corp', date: 'Mar 26', duration: '1:02:18', type: 'Client',    status: 'Done',       statusColor: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-xl text-left select-none">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
        <div className="size-2.5 rounded-full bg-red-400/70" />
        <div className="size-2.5 rounded-full bg-amber-400/70" />
        <div className="size-2.5 rounded-full bg-emerald-400/70" />
        <div className="flex-1 mx-3 h-5 rounded-md bg-muted/60 border border-border/60 flex items-center px-2">
          <span className="text-[9px] text-muted-foreground/50 font-mono">notus.app/dashboard</span>
        </div>
      </div>

      {/* App layout */}
      <div className="flex" style={{ height: 320 }}>

        {/* Sidebar */}
        <div className="w-10 border-r border-border bg-muted/20 flex flex-col items-center py-3 gap-2 shrink-0">
          <div className="size-6 rounded-md flex items-center justify-center mb-2" style={{ backgroundColor: '#6366f1' }}>
            <svg width="10" height="9" viewBox="0 0 16 14" fill="none">
              <rect x="0" y="5" width="2.5" height="4" rx="1.25" fill="white" fillOpacity="0.5"/>
              <rect x="3.5" y="2" width="2.5" height="10" rx="1.25" fill="white"/>
              <rect x="7" y="3.5" width="2.5" height="7" rx="1.25" fill="white" fillOpacity="0.75"/>
              <rect x="10.5" y="0" width="2.5" height="14" rx="1.25" fill="white"/>
              <rect x="14" y="4.5" width="2.5" height="5" rx="1.25" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          {([
            [LayoutDashboard, true],
            [FileText,        false],
            [Search,          false],
            [Users,           false],
            [Settings,        false],
          ] as const).map(([Icon, active], i) => (
            <div key={i} className={`size-7 rounded-lg flex items-center justify-center ${active ? 'bg-indigo-500/10' : ''}`}>
              <Icon className={`size-3 ${active ? 'text-indigo-500' : 'text-muted-foreground'}`} strokeWidth={active ? 2.25 : 1.75} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden pr-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 border-b border-border shrink-0">
            {[
              { Icon: Video,         label: 'Meets',  value: '24', color: 'text-muted-foreground' },
              { Icon: CheckCircle2,  label: 'Done',   value: '18', color: 'text-emerald-500' },
              { Icon: Clock,         label: 'Mins',   value: '847', color: 'text-muted-foreground' },
              { Icon: CalendarDays,  label: 'Week',   value: '6',  color: 'text-indigo-500' },
            ].map(({ Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-1 px-1.5 py-2 border-r border-border last:border-0 min-w-0 overflow-hidden">
                <div className="size-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className={`size-2.5 ${color}`} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5 truncate">{label}</p>
                  <p className="text-[12px] font-bold text-foreground leading-none tabular-nums">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 bg-background">
            <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md border border-border bg-muted/40">
              <Search className="size-2.5 text-muted-foreground shrink-0" strokeWidth={2} />
              <span className="text-[10px] text-muted-foreground/60">Filter meetings...</span>
            </div>
          </div>

          {/* Table header */}
          <div className="grid border-b border-border shrink-0 bg-muted/10" style={{ gridTemplateColumns: '1fr 56px 48px 72px' }}>
            {['Name', 'Dur.', 'Date', 'Type'].map((h) => (
              <div key={h} className="px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="overflow-hidden flex-1">
            {meetings.map((m, i) => (
              <div key={i} className="grid border-b border-border/60 hover:bg-muted/30 last:border-0" style={{ gridTemplateColumns: '1fr 56px 48px 72px' }}>
                <div className="px-3 py-2 flex items-center gap-1.5 min-w-0">
                  <span className={`size-1.5 rounded-full shrink-0 ${m.dot}`} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{m.title}</span>
                </div>
                <div className="px-3 py-2 flex items-center">
                  <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">{m.duration}</span>
                </div>
                <div className="px-3 py-2 flex items-center">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">{m.date}</span>
                </div>
                <div className="px-2 py-2 flex items-center">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-muted/60 text-muted-foreground truncate max-w-full">{m.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Features() {
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
    <div id="features" ref={ref}>

      {/* ─── Bridge Section ─── */}
      <section className="pt-28 pb-20 px-5 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">

          <div className="section-reveal inline-flex items-center justify-center size-10 rounded-2xl border border-border bg-muted/50 mb-8">
            <Mic className="size-4 text-muted-foreground" strokeWidth={1.5} />
          </div>

          <h2 className="section-reveal text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-5">
            Everything your meetings need,
            <br />
            <span className="text-indigo-600">all in one place</span>
          </h2>

          <p className="section-reveal text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            From the first word spoken to the last action item shipped.
          </p>

          <div className="section-reveal">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-foreground text-background font-semibold rounded-full px-6 py-2.5 text-sm
                hover:scale-[1.02] active:scale-[0.97] shadow-sm"
              style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)' }}
            >
              <Sparkles className="size-3.5" />
              Get started free
            </Link>
          </div>

          {/* ─── 3 Feature Cards ─── */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
            {featureCards.map(({ Icon, title, description, Preview }, i) => (
              <div
                key={title}
                className="section-reveal group flex flex-col text-left rounded-2xl border border-border bg-background p-5
                  hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/[0.04]"
                style={{ transition: 'border-color 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms cubic-bezier(0.23,1,0.32,1)', transitionDelay: `${i * 60}ms` }}
              >
                {/* Mini UI Preview */}
                <div className="mb-5 rounded-xl bg-muted/30 border border-border/60 p-3 overflow-hidden">
                  <Preview />
                </div>

                {/* Icon + Title */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="size-7 rounded-lg bg-muted border border-border flex items-center justify-center
                    group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5"
                    style={{ transition: 'background-color 150ms ease-out, border-color 150ms ease-out' }}>
                    <Icon className="size-3.5 text-muted-foreground group-hover:text-indigo-500" style={{ transition: 'color 150ms ease-out' }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>

                <Link
                  href="#"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground
                    transition-colors duration-150"
                >
                  Learn more
                  <ArrowRight className="size-3 group-hover:translate-x-1" style={{ transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)' }} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Split Section 1: UI left, Text right ─── */}
      <section className="py-20 px-5 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Left: Mini dashboard preview */}
            <div className="section-reveal">
              <DashboardPreview />
            </div>

            {/* Right: Text */}
            <div className="section-reveal space-y-6">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-[0.15em]">Real-time intelligence</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
                Empowering your<br />meeting workflow
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {splitFeature1.map(({ Icon, title, desc }, i) => (
                  <div key={title} className="section-reveal space-y-2" style={{ transitionDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="size-5 text-indigo-600 shrink-0" strokeWidth={1.5} />
                      <p className="text-lg font-semibold text-foreground">{title}</p>
                    </div>
                    <p className="text-base text-foreground/70 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Split Section 2: Text left, UI right ─── */}
      <section className="py-20 px-5 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Left: Text */}
            <div className="section-reveal space-y-6 order-2 lg:order-1">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-[0.15em]">AI that knows your work</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
                Built to keep you<br />in the conversation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {splitFeature2.map(({ Icon, title, desc }, i) => (
                  <div key={title} className="section-reveal space-y-2" style={{ transitionDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="size-5 text-indigo-600 shrink-0" strokeWidth={1.5} />
                      <p className="text-lg font-semibold text-foreground">{title}</p>
                    </div>
                    <p className="text-base text-foreground/70 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Notes Card */}
            <div className="section-reveal order-1 lg:order-2">
              <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">

                {/* Tabs */}
                <div className="flex border-b border-border bg-muted/20">
                  {['Notes', 'Actions', 'Follow-up'].map((tab, i) => (
                    <button
                      key={tab}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors duration-150 ${
                        i === 0
                          ? 'text-foreground border-b-2 border-indigo-500 bg-background -mb-px'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                  <div className="flex-1 flex items-center justify-end pr-4">
                    <span className="text-[9px] text-indigo-600 font-medium">✦ Ready</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Summary</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Q2 planning sync. Team decided to ship Redis caching before June 1 and push mobile to Q3.
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Action Items</p>
                    <div className="space-y-2">
                      {[
                        { t: 'Redis caching POC', o: 'Mike R.', d: 'Thu', done: true },
                        { t: 'Update API SLA docs', o: 'Sarah K.', d: 'Fri', done: false },
                        { t: 'Schedule infra review', o: 'Alex M.', d: 'Mon', done: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`size-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                              item.done ? 'border-indigo-500 bg-indigo-500' : 'border-border'
                            }`}>
                              {item.done && (
                                <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-[11px] truncate ${item.done ? 'text-muted-foreground line-through' : 'text-foreground/80'}`}>
                              {item.t}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-muted-foreground">{item.o}</span>
                            <span className={`text-[9px] font-medium ${item.done ? 'text-emerald-500' : 'text-indigo-600'}`}>
                              {item.done ? 'Done' : item.d}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role list */}
                  <div>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attendees</p>
                    {[
                      { role: 'Engineering Lead', person: 'Alex Marshall' },
                      { role: 'Backend Engineer', person: 'Sarah K.' },
                      { role: 'Infra Engineer', person: 'Mike R.' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-[10px] border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">{r.role}</span>
                        <span className="font-medium text-foreground/80">{r.person}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Integrations Section ─── */}
      <section className="py-24 px-5 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <div className="section-reveal mb-10">
            <svg width="40" height="28" viewBox="0 0 40 28" fill="none" className="mx-auto mb-8 text-muted-foreground/30">
              <path d="M3 14 Q10 3 20 14 Q30 25 37 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15] mb-4">
              Less setup,{' '}
              <span className="text-indigo-600">more focus</span>
            </h2>
            <p className="text-muted-foreground text-base mb-6 max-w-md mx-auto">
              Connects with the tools you already use. No bots, no friction, no extra tabs.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-muted-foreground
                transition-colors duration-150"
            >
              See all integrations <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="section-reveal grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Zoom',    src: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/zoom-icon.svg' },
              { label: 'Meet',    src: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/google-meet.svg' },
              { label: 'Teams',   src: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/microsoft-teams.svg' },
              { label: 'Slack',   src: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/slack-icon.svg' },
              { label: 'Notion',  src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/notion/notion-original.svg', invert: true },
              { label: 'HubSpot', src: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/hubspot.svg', size: 'size-24' },
            ].map(({ label, src, invert, size }, i) => (
              <div
                key={label}
                className="flex items-center justify-center p-2"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <img
                  src={src}
                  alt={label}
                  className={`${size ?? 'size-14'} object-contain${invert ? ' dark:invert' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { Mic, Zap, FileText, MessageSquare, Share2, Calendar, Users, Shield } from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: 'Real-time transcription',
    description: 'Deepgram Nova-2 captures every word live — speaker-diarized, timestamped, searchable.',
    tag: 'Core',
  },
  {
    icon: Zap,
    title: 'AI-generated notes',
    description: 'Claude AI structures your transcript into summaries, decisions, and action items automatically.',
    tag: 'AI',
  },
  {
    icon: FileText,
    title: 'Smart templates',
    description: '5 built-in templates for 1-on-1s, sales calls, user interviews, and more. Or build your own.',
    tag: 'Productivity',
  },
  {
    icon: MessageSquare,
    title: 'Chat with transcripts',
    description: '"What did we decide about pricing?" Get instant answers from any meeting transcript.',
    tag: 'AI',
  },
  {
    icon: Share2,
    title: 'One-click sharing',
    description: 'Public links, Slack exports, Notion pages, or email summaries — however your team works.',
    tag: 'Sharing',
  },
  {
    icon: Calendar,
    title: 'Calendar sync',
    description: 'Google Calendar integration auto-fills meeting titles and participants. Start recording from your calendar.',
    tag: 'Integration',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    description: 'Shared meeting libraries, team templates, and permission controls for growing teams.',
    tag: 'Teams',
  },
  {
    icon: Shield,
    title: 'Privacy by design',
    description: 'GDPR consent flow, row-level security, end-to-end encryption. Your data stays yours.',
    tag: 'Security',
  },
]

export function Features() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    const els = ref.current?.querySelectorAll('.section-reveal')
    els?.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" className="py-32 px-5" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="section-reveal max-w-xl mb-20">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-[0.15em] mb-4">Features</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Everything your meetings need
          </h2>
          <p className="mt-4 text-zinc-400 text-lg leading-relaxed">
            From the first word spoken to the last action item assigned.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.04]">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="section-reveal group p-6 bg-[#0a0a0b] hover:bg-[#111113] transition-colors duration-300"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="size-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all">
                    <Icon className="size-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-zinc-700 font-medium uppercase tracking-wide">{feature.tag}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

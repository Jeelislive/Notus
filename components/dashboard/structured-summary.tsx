'use client'

import { Target, HelpCircle, Zap, AlertTriangle, Quote } from 'lucide-react'

export interface StructuredSummaryData {
  overview: { participants: string[]; type: string }
  decisions: Array<{ text: string; speaker: string; timestamp: string }>
  openQuestions: Array<{ text: string; answered: boolean }>
  actionItems: Array<{ text: string; assignee: string; deadline: string; priority: 'high' | 'medium' | 'low' }>
  risks: Array<{ text: string; speaker: string; timestamp: string }>
  keyQuotes: Array<{ text: string; speaker: string; timestamp: string }>
  summary: string
  followUpEmail: string
}

const serif = { fontFamily: 'var(--font-bitter), Georgia, serif' } as const

function SpeakerChip({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span
      className="inline-flex items-center justify-center size-5 rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground shrink-0"
      title={name}
    >
      {initials}
    </span>
  )
}

function TimestampChip({ ts }: { ts: string }) {
  if (!ts) return null
  return (
    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{ts}</span>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
}

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  colorClass: string
  children: React.ReactNode
  empty?: boolean
}

function SectionCard({ icon, title, colorClass, children, empty }: SectionCardProps) {
  if (empty) return null
  return (
    <section className={`rounded-2xl border p-5 space-y-3 ${colorClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{title}</p>
      </div>
      {children}
    </section>
  )
}

interface StructuredSummaryProps {
  data: StructuredSummaryData
}

export function StructuredSummary({ data }: StructuredSummaryProps) {
  return (
    <div className="space-y-5">
      {/* Overview */}
      {(data.overview?.participants?.length > 0 || data.overview?.type) && (
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-4 text-indigo-500 font-bold text-[14px] leading-none">✦</span>
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Overview</p>
          </div>
          {data.overview.type && (
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Type:</span> {data.overview.type}
            </p>
          )}
          {data.overview.participants?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.overview.participants.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[12px] font-medium text-indigo-700 dark:text-indigo-300"
                >
                  <SpeakerChip name={p} />
                  {p}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Summary */}
      {data.summary && (
        <section className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-4 text-indigo-400 font-bold text-[14px] leading-none">★</span>
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Summary</p>
          </div>
          <p
            className="text-foreground"
            style={{ ...serif, fontSize: '17px', fontWeight: 500, lineHeight: '1.85', letterSpacing: '0.005em' }}
          >
            {data.summary}
          </p>
        </section>
      )}

      {/* Decisions */}
      <SectionCard
        icon={<Target className="size-4 text-emerald-600 dark:text-emerald-400" />}
        title="Decisions"
        colorClass="border-emerald-500/20 bg-emerald-500/5"
        empty={!data.decisions?.length}
      >
        <ul className="space-y-3">
          {data.decisions.map((d, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-foreground"
                  style={{ ...serif, fontSize: '15px', fontWeight: 500, lineHeight: '1.7' }}
                >
                  {d.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {d.speaker && <SpeakerChip name={d.speaker} />}
                  {d.speaker && <span className="text-[11px] text-muted-foreground">{d.speaker}</span>}
                  <TimestampChip ts={d.timestamp} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Action Items */}
      <SectionCard
        icon={<Zap className="size-4 text-orange-500" />}
        title="Action Items"
        colorClass="border-orange-500/20 bg-orange-500/5"
        empty={!data.actionItems?.length}
      >
        <ul className="space-y-3">
          {data.actionItems.map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="size-5 rounded-md border-2 border-orange-500/40 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-foreground"
                  style={{ ...serif, fontSize: '15px', fontWeight: 500, lineHeight: '1.7' }}
                >
                  {a.text}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {a.assignee && (
                    <span className="flex items-center gap-1.5">
                      <SpeakerChip name={a.assignee} />
                      <span className="text-[11px] text-muted-foreground">{a.assignee}</span>
                    </span>
                  )}
                  {a.deadline && (
                    <span className="text-[11px] text-muted-foreground/80 border border-border rounded px-1.5 py-0.5">
                      {a.deadline}
                    </span>
                  )}
                  {a.priority && (
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 ${PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.medium}`}
                    >
                      {a.priority}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Open Questions */}
      <SectionCard
        icon={<HelpCircle className="size-4 text-blue-500" />}
        title="Open Questions"
        colorClass="border-blue-500/20 bg-blue-500/5"
        empty={!data.openQuestions?.length}
      >
        <ul className="space-y-2.5">
          {data.openQuestions.map((q, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-blue-400 mt-0.5 shrink-0 text-[13px] leading-none font-bold">?</span>
              <p
                className="text-foreground"
                style={{ ...serif, fontSize: '15px', fontWeight: 500, lineHeight: '1.7' }}
              >
                {q.text}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Risks */}
      <SectionCard
        icon={<AlertTriangle className="size-4 text-amber-500" />}
        title="Risks & Blockers"
        colorClass="border-amber-500/20 bg-amber-500/5"
        empty={!data.risks?.length}
      >
        <ul className="space-y-3">
          {data.risks.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="size-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-foreground"
                  style={{ ...serif, fontSize: '15px', fontWeight: 500, lineHeight: '1.7' }}
                >
                  {r.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {r.speaker && <SpeakerChip name={r.speaker} />}
                  {r.speaker && <span className="text-[11px] text-muted-foreground">{r.speaker}</span>}
                  <TimestampChip ts={r.timestamp} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Key Quotes */}
      <SectionCard
        icon={<Quote className="size-4 text-purple-500" />}
        title="Key Quotes"
        colorClass="border-purple-500/20 bg-purple-500/5"
        empty={!data.keyQuotes?.length}
      >
        <ul className="space-y-4">
          {data.keyQuotes.map((q, i) => (
            <li key={i} className="space-y-1.5">
              <p
                className="text-foreground/90 italic"
                style={{ ...serif, fontSize: '16px', fontWeight: 500, lineHeight: '1.75' }}
              >
                &ldquo;{q.text}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                {q.speaker && <SpeakerChip name={q.speaker} />}
                {q.speaker && <span className="text-[11px] text-muted-foreground">— {q.speaker}</span>}
                <TimestampChip ts={q.timestamp} />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'

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

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <span className="inline-flex items-center justify-center size-[22px] rounded-full bg-muted border border-border text-[9px] font-bold text-muted-foreground shrink-0">
      {initials}
    </span>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em] mb-3.5">
      {children}
    </p>
  )
}

export function StructuredSummary({ data }: { data: StructuredSummaryData }) {
  const hasSections =
    data.decisions?.length > 0 ||
    data.actionItems?.length > 0 ||
    data.openQuestions?.length > 0 ||
    data.risks?.length > 0 ||
    data.keyQuotes?.length > 0

  return (
    <div>
      {/* Summary — large display text, no box */}
      {data.summary && (
        <p
          className="text-foreground mb-7 leading-[1.75]"
          style={{
            fontFamily: 'var(--font-display), EB Garamond, Georgia, serif',
            fontSize: '21px',
            fontWeight: 400,
            letterSpacing: '-0.005em',
          }}
        >
          {data.summary}
        </p>
      )}

      {/* Participants */}
      {data.overview?.participants?.length > 0 && (
        <div className={`${hasSections || data.summary ? 'pb-6 mb-6 border-b border-border' : ''}`}>
          <SectionLabel>Participants</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {data.overview.participants.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[12.5px] text-foreground"
              >
                <Avatar name={p} />
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decisions */}
      {data.decisions?.length > 0 && (
        <div className="pb-6 mb-6 border-b border-border">
          <SectionLabel>Decisions Made</SectionLabel>
          <ul className="space-y-3.5">
            {data.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-[9px] size-1.5 rounded-full bg-foreground/25 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] text-foreground leading-relaxed">{d.text}</p>
                  {(d.speaker || d.timestamp) && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {d.speaker}{d.speaker && d.timestamp ? ' · ' : ''}{d.timestamp}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {data.actionItems?.length > 0 && (
        <div className="pb-6 mb-6 border-b border-border">
          <SectionLabel>Action Items</SectionLabel>
          <ul className="space-y-3">
            {data.actionItems.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-[3px] size-[15px] rounded-[4px] border-2 border-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] text-foreground leading-relaxed">{a.text}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {a.assignee && (
                      <span className="flex items-center gap-1">
                        <Avatar name={a.assignee} />
                        <span className="text-[11px] text-muted-foreground">{a.assignee}</span>
                      </span>
                    )}
                    {a.deadline && (
                      <span className="text-[11px] text-muted-foreground/60">{a.deadline}</span>
                    )}
                    {a.priority === 'high' && (
                      <span className="text-[10px] font-medium text-red-500 bg-red-500/8 px-1.5 py-0.5 rounded-full">
                        high
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open Questions */}
      {data.openQuestions?.length > 0 && (
        <div className="pb-6 mb-6 border-b border-border">
          <SectionLabel>Open Questions</SectionLabel>
          <ul className="space-y-3">
            {data.openQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-[13px] text-muted-foreground/40 font-mono shrink-0 leading-relaxed">?</span>
                <p className="text-[14.5px] text-foreground leading-relaxed">{q.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks & Blockers */}
      {data.risks?.length > 0 && (
        <div className="pb-6 mb-6 border-b border-border">
          <SectionLabel>Risks & Blockers</SectionLabel>
          <ul className="space-y-3.5">
            {data.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-[9px] size-1.5 rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] text-foreground leading-relaxed">{r.text}</p>
                  {r.speaker && <p className="text-[11px] text-muted-foreground mt-1">{r.speaker}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Quotes */}
      {data.keyQuotes?.length > 0 && (
        <div className="pb-2">
          <SectionLabel>Key Quotes</SectionLabel>
          <ul className="space-y-5">
            {data.keyQuotes.map((q, i) => (
              <li key={i} className="pl-4 border-l-2 border-foreground/10">
                <p
                  className="text-foreground/80 italic leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-display), EB Garamond, Georgia, serif',
                    fontSize: '16px',
                    fontWeight: 400,
                  }}
                >
                  &ldquo;{q.text}&rdquo;
                </p>
                {q.speaker && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {q.speaker}{q.timestamp ? ` · ${q.timestamp}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

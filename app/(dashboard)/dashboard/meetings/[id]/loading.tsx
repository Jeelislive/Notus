export default function MeetingDetailLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Back link */}
      <div className="h-4 w-24 rounded bg-muted mb-3" />

      {/* Title + badge */}
      <div className="flex items-center gap-3 mb-1">
        <div className="h-7 w-64 rounded-lg bg-muted" />
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>

      {/* Meta row */}
      <div className="flex gap-4 mb-6">
        <div className="h-4 w-28 rounded bg-muted/60" />
        <div className="h-4 w-20 rounded bg-muted/60" />
      </div>

      {/* Content panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Transcript panel */}
        <div className="flex-1 rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-3">
          <div className="h-5 w-32 rounded bg-muted mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/4 rounded bg-muted/60" />
                <div className="h-4 rounded bg-muted/40" style={{ width: `${60 + (i % 3) * 15}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Side panel */}
        <div className="w-72 shrink-0 rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-3">
          <div className="h-5 w-28 rounded bg-muted mb-2" />
          <div className="h-4 w-full rounded bg-muted/60" />
          <div className="h-4 w-5/6 rounded bg-muted/60" />
          <div className="h-4 w-4/5 rounded bg-muted/60" />
          <div className="h-4 w-3/4 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

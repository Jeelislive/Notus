export default function TeamsLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-20 rounded-lg bg-muted" />
          <div className="h-3.5 w-64 rounded bg-muted/50 mt-1.5" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted" />
      </div>

      {/* Team cards */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            style={{ opacity: 1 - i * 0.15 }}
          >
            {/* Avatar */}
            <div className="size-11 rounded-xl bg-muted shrink-0" />
            {/* Text */}
            <div className="flex-1 space-y-1.5">
              <div className="h-4 rounded bg-muted" style={{ width: `${40 + i * 15}%` }} />
              <div className="h-3 w-16 rounded bg-muted/50" />
            </div>
            {/* Chevron */}
            <div className="size-4 rounded bg-muted/40 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="-mx-4 md:-mx-8 -mt-16 md:-mt-8 flex flex-col h-full min-h-0 animate-pulse">
      {/* DashboardHeader */}
      <div className="px-6 md:px-8 pt-7 pb-5 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-8 w-32 rounded-lg bg-muted" />
            <div className="h-3.5 w-56 rounded bg-muted/60 mt-2" />
          </div>
          <div className="mt-1 h-8 w-48 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Meeting rows */}
      <div className="flex-1 overflow-hidden">
        {[
          { label: 72, rows: 3 },
          { label: 56, rows: 2 },
        ].map((group, gi) => (
          <div key={gi}>
            {/* Date group label */}
            <div className="px-6 py-2 flex items-center gap-2">
              <div className="h-3 rounded bg-muted/50" style={{ width: `${group.label}px` }} />
            </div>
            {/* Rows */}
            {Array.from({ length: group.rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-6 py-3 border-b border-border/40" style={{ opacity: 1 - i * 0.12 }}>
                {/* Icon */}
                <div className="size-9 rounded-xl bg-muted shrink-0" />
                {/* Text */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-[14.5px] rounded bg-muted" style={{ width: `${45 + (i * 17) % 35}%` }} />
                  <div className="h-3 rounded bg-muted/50" style={{ width: `${28 + (i * 11) % 20}%` }} />
                </div>
                {/* Action button */}
                <div className="size-7 rounded-lg bg-muted/50 shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

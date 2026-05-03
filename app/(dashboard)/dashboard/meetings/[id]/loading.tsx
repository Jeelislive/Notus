export default function MeetingDetailLoading() {
  return (
    <div className="flex flex-1 -mx-4 -mt-16 -mb-4 md:-mx-8 md:-mt-8 md:-mb-8 overflow-hidden animate-pulse">

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-4 pb-0 border-b border-border shrink-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <div className="h-5 w-14 rounded-full bg-muted shrink-0" />
            <div className="h-6 w-64 rounded-lg bg-muted" />
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-3.5 w-24 rounded bg-muted/50" />
            <div className="h-3.5 w-16 rounded bg-muted/50" />
            <div className="h-3.5 w-20 rounded bg-muted/50" />
          </div>
          {/* Tab bar */}
          <div className="flex items-center gap-1 -mx-1">
            <div className="h-8 w-16 rounded-t-md bg-muted/60" />
            <div className="h-8 w-20 rounded-t-md bg-muted/30" />
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border shrink-0">
          {Array.from({ length: 9 }).map((_, i) =>
            i === 4 || i === 6 ? (
              <div key={i} className="w-px h-4 bg-border mx-1" />
            ) : (
              <div key={i} className="size-9 rounded-md bg-muted/40" />
            )
          )}
        </div>

        {/* Editor body */}
        <div className="p-6 flex-1 space-y-4">
          <div className="h-7 w-1/3 rounded-lg bg-muted" />
          <div className="space-y-2.5">
            {[90, 75, 85, 60, 80].map((w, i) => (
              <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="h-6 w-2/5 rounded-lg bg-muted mt-6" />
          <div className="space-y-2.5">
            {[70, 88, 65].map((w, i) => (
              <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="hidden lg:flex flex-col w-[520px] xl:w-[580px] border-l border-border shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="flex items-center gap-1">
            <div className="size-8 rounded-lg bg-muted/50" />
            <div className="size-8 rounded-lg bg-muted/50" />
            <div className="size-8 rounded-lg bg-muted/50" />
          </div>
        </div>
        {/* Quick prompts */}
        <div className="flex-1 px-4 py-5 space-y-2">
          <div className="h-3 w-20 rounded bg-muted/50 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl border border-border bg-muted/20" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
        {/* Input */}
        <div className="px-4 pb-4 pt-3 border-t border-border">
          <div className="h-12 rounded-2xl border border-border bg-muted/20" />
        </div>
      </div>
    </div>
  )
}

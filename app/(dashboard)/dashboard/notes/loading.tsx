export default function NotesLoading() {
  return (
    <div className="flex h-full gap-4 animate-pulse">
      {/* Left sidebar - meeting list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="h-8 w-32 rounded-lg bg-muted mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/60" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Tab bar */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-20 rounded-lg bg-muted" />
          ))}
        </div>

        {/* Editor area */}
        <div className="flex-1 rounded-xl bg-muted/30 border border-border p-6 flex flex-col gap-3">
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted/60" />
          <div className="h-4 w-5/6 rounded bg-muted/60" />
          <div className="h-4 w-4/5 rounded bg-muted/60" />
          <div className="mt-4 h-4 w-full rounded bg-muted/60" />
          <div className="h-4 w-2/3 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

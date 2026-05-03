export default function SettingsLoading() {
  return (
    <div className="space-y-5 max-w-2xl animate-pulse">
      {/* Title */}
      <div>
        <div className="h-7 w-24 rounded-lg bg-muted" />
        <div className="h-3.5 w-56 rounded bg-muted/50 mt-1.5" />
      </div>

      {/* Language card */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="h-3.5 w-28 rounded bg-muted" />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-4 w-40 rounded bg-muted/60" />
          <div className="h-9 w-full rounded-lg bg-muted/40" />
        </div>
      </div>

      {/* Account card */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="h-3.5 w-20 rounded bg-muted" />
        </div>
        {/* Email row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="h-4 w-12 rounded bg-muted/60" />
            <div className="h-3.5 w-44 rounded bg-muted/40" />
          </div>
        </div>
        {/* Plan row */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="space-y-1.5">
            <div className="h-4 w-10 rounded bg-muted/60" />
            <div className="h-3.5 w-36 rounded bg-muted/40" />
          </div>
          <div className="h-4 w-36 rounded bg-muted/40" />
        </div>
      </div>

      {/* Integrations card */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded bg-muted/60" />
            <div className="h-3.5 w-56 rounded bg-muted/40" />
          </div>
        </div>
        <div className="size-4 rounded bg-muted/50" />
      </div>
    </div>
  )
}

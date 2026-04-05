export default function SettingsLoading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-8">
      <div className="h-7 w-24 rounded-lg bg-muted" />

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4 p-6 rounded-xl border border-border bg-muted/20">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted/60" />
          <div className="h-10 w-full rounded-lg bg-muted/40" />
        </div>
      ))}
    </div>
  )
}

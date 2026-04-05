export default function TeamsLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-muted/40 border border-border mb-3" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-16 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
        <div className="ml-auto h-8 w-48 rounded-lg bg-muted" />
      </div>

      {/* Table header */}
      <div className="h-10 rounded-t-lg bg-muted/60 mb-px" />

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted/30 border-b border-border" style={{ opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  )
}

export default function SearchLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="h-7 w-24 rounded-lg bg-muted mb-6" />
      <div className="h-11 w-full rounded-xl bg-muted mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-muted/40 border border-border mb-2" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

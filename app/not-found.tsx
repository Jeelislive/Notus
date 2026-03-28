import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm mx-auto px-6">
        <p className="text-[64px] font-bold text-foreground leading-none mb-4">404</p>
        <h1 className="text-xl font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-[14px] text-muted-foreground mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-indigo-500 hover:text-indigo-400"
          style={{ transition: 'color 150ms ease-out' }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

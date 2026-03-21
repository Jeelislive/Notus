import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-300">Notus</span>
          <span className="text-zinc-700 text-sm ml-2">© {new Date().getFullYear()}</span>
        </div>

        <nav className="flex flex-wrap gap-5 text-sm text-zinc-600">
          <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-zinc-300 transition-colors">Pricing</a>
          <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-zinc-300 transition-colors">Sign up</Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
        </nav>
      </div>
    </footer>
  )
}

import type { Metadata } from 'next'
import { Inter, Bitter } from 'next/font/google'
import { Suspense } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { PostHogProvider } from '@/components/posthog-provider'
import { PostHogPageView } from '@/components/posthog-pageview'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const bitter = Bitter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bitter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Notus',
    template: '%s | Notus',
  },
  description:
    'Notus records, transcribes, and turns your meetings into structured notes with summaries, action items, and follow-up emails - automatically.',
  keywords: ['meeting notes', 'AI transcription', 'meeting recorder', 'meeting summary'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/logo-icon.svg',
  },
  openGraph: {
    title: 'Notus - AI Meeting Notes',
    description: 'Stop taking notes. Start having better meetings.',
    type: 'website',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bitter.variable}`} suppressHydrationWarning>
      <body>
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            {children}
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}

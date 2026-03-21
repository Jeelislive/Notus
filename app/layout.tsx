import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Notus — AI Meeting Notes',
    template: '%s | Notus',
  },
  description:
    'Notus records, transcribes, and turns your meetings into structured notes with summaries, action items, and follow-up emails — automatically.',
  keywords: ['meeting notes', 'AI transcription', 'meeting recorder', 'meeting summary'],
  openGraph: {
    title: 'Notus — AI Meeting Notes',
    description: 'Stop taking notes. Start having better meetings.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  )
}

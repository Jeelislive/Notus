import { LandingNav } from '@/components/landing/nav'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { CTABanner } from '@/components/landing/cta-banner'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <main className="bg-zinc-950">
      <LandingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  )
}

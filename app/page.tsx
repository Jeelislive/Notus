import { LandingNav } from '@/components/landing/nav'
import { Hero } from '@/components/landing/hero'
import { Logos } from '@/components/landing/logos'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { Testimonials } from '@/components/landing/testimonials'
import { CTABanner } from '@/components/landing/cta-banner'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      <LandingNav />
      <Hero />
      <Logos />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTABanner />
      <Footer />
    </main>
  )
}

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { ClosingCta } from '@/components/sections/closing-cta';
import { FaqSection } from '@/components/sections/faq';
import { FeaturesSection } from '@/components/sections/features';
import { ForClientsSection } from '@/components/sections/for-clients';
import { ForCoachesSection } from '@/components/sections/for-coaches';
import { Hero } from '@/components/sections/hero';
import { HowItWorksSection } from '@/components/sections/how-it-works';
import { ProblemSection } from '@/components/sections/problem';
import { TrustSection } from '@/components/sections/trust';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <ProblemSection />
        <ForCoachesSection />
        <ForClientsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <TrustSection />
        <FaqSection />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}

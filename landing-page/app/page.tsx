import { Navbar } from '@/components/navbar';
import { NewHero } from '@/components/sections/new_hero';
import { MarqueeSection } from '@/components/sections/marquee-section';
import { HowItWorksSection } from '@/components/sections/how-it-works';
import { ProblemSection } from '@/components/sections/problem';
import { WorkflowSection } from '@/components/sections/workflow';
import { FeaturesSection } from '@/components/sections/features';
import { ShowcaseSection } from '@/components/sections/showcase';
import { EarlyAccessSection } from '@/components/sections/early-access';
import { ClosingCta } from '@/components/sections/closing-cta';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(126,200,255,0.12),_transparent_30%)] text-cream">
      <Navbar />
      <NewHero />
      <MarqueeSection />
      <HowItWorksSection />
      <ProblemSection />
      <WorkflowSection />
      <FeaturesSection />
      <ShowcaseSection />
      <EarlyAccessSection />
      <ClosingCta />
      <Footer />
    </main>
  );
}

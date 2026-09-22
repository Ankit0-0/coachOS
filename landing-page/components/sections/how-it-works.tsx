import DepthCarousel from '@/components/DepthCarousel';

const items = Array.from({ length: 5 }, (_, index) => ({
  image: '/wa_ss.png',
  alt: `Workflow preview ${index + 1}`
}));

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-2 py-5 sm:px-3 lg:px-4 lg:py-6" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
      <div className="mb-4 max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-accent">How it works</p>
        <h2 className="text-2xl font-semibold text-cream sm:text-3xl lg:text-4xl">
          One place for your coaching flow, from first message to final check-in.
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted sm:text-base">
          Replace scattered notes, screenshots, and follow-up calls with a calm system that keeps everything visible.
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(126,200,255,0.12),_transparent_40%)] p-1.5 shadow-glow sm:p-2 lg:p-3">
        <div className="h-[400px] w-full sm:h-[460px] lg:h-[520px]">
          <DepthCarousel
            items={items}
            depth={220}
            spread={90}
            tilt={22}
            tiltDirection="right"
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={6}
            autoplay
            loop
            showControls
            showIndicators
            cardWidth={280}
            cardHeight={380}
            radius={20}
            tint="#05060a"
          />
        </div>
      </div>
    </section>
  );
}

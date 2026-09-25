import { AudienceButtons, Container, Mark } from '@/components/ui';
import { ClientTodayScreen, CoachClientsScreen } from '@/components/mockups/app-screens';

export function Hero() {

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* A soft sage wash behind the phones, so they sit on something. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[36rem] w-[36rem] rounded-full bg-sage/70 blur-3xl sm:-right-20" />

      <Container className="relative grid items-center gap-12 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-20 lg:pt-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-forest ring-1 ring-forest/10">
            <span className="h-2 w-2 rounded-full bg-terracotta" aria-hidden="true" />
            Pre-launch · Join early access for Android &amp; iPhone
          </p>
          <h1
            id="hero-title"
            className="text-balance mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-forest sm:text-6xl lg:text-[4.1rem]"
          >
            Coaching, without the chaos.
          </h1>
          <p className="text-pretty mt-6 max-w-xl text-lg leading-8 text-charcoal/85 sm:text-xl sm:leading-9">
            Keep <Mark>client plans, progress and check-ins together</Mark> — so coaches can focus on coaching and
            clients know what to do next.
          </p>

          <AudienceButtons className="mt-9" />
          <p className="mt-4 text-sm text-muted">Both join early access. Not in app stores yet.</p>

          <p className="mt-10 flex items-center gap-3 border-t border-forest/10 pt-6 text-sm font-medium text-charcoal/80">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 text-forest" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
              <path d="M9 12l2 2 4-4.5" />
            </svg>
            Built for the everyday work of online fitness coaching.
          </p>
        </div>

        {/* Two phones: the coach's roster behind, the client's day in front. */}
        <div className="relative mx-auto w-full max-w-[26rem] sm:max-w-[32rem] lg:max-w-none">
          <div className="relative flex items-start justify-center">
            <div className="rise-in w-[54%] max-w-[300px] -rotate-3" style={{ animationDelay: '0.1s' }}>
              <CoachClientsScreen />
              <p className="mt-4 text-center text-sm font-semibold text-forest">Coach app</p>
            </div>
            <div className="rise-in -ml-[10%] mt-[14%] w-[54%] max-w-[300px] rotate-2" style={{ animationDelay: '0.25s' }}>
              <ClientTodayScreen />
              <p className="mt-4 text-center text-sm font-semibold text-forest">Client app</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { ClientTodayScreen, ClientWorkoutScreen } from '@/components/mockups/app-screens';
import { Arrow, Container, Mark, Reveal, SectionHeading } from '@/components/ui';

const benefits: { title: string; body: ReactNode; icon: ReactNode }[] = [
  {
    title: 'Open the app, see today',
    body: (
      <>
        Today&apos;s workout and meals, <Mark>no PDF hunting</Mark>.
      </>
    ),
    icon: <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />,
  },
  {
    title: 'Tick it off as you go',
    body: (
      <>
        Sets and meals done, <Mark>notes for your coach</Mark>.
      </>
    ),
    icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  },
  {
    title: 'Log progress in seconds',
    body: (
      <>
        Weight and a photo, <Mark>trend over time</Mark>.
      </>
    ),
    icon: <path d="M4 18l5-6 4 3 7-8M15 7h5v5" />,
  },
  {
    title: 'Stay in touch',
    body: (
      <>
        Your coach sees your logs, <Mark>WhatsApp in one tap</Mark>.
      </>
    ),
    icon: <path d="M4 5h16v11H9l-5 4z" />,
  },
];

export function ForClientsSection() {
  const earlyAccess = useEarlyAccess();

  return (
    <section id="for-clients" aria-labelledby="for-clients-title" className="bg-sage/60 py-16 sm:py-24">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">
          <Reveal className="order-last mx-auto flex w-full max-w-[30rem] items-start justify-center gap-4 lg:sticky lg:top-24 lg:order-first">
            <div className="mt-10 w-1/2">
              <ClientTodayScreen />
              <p className="mt-3 text-center text-sm text-charcoal/80">Your day</p>
            </div>
            <div className="w-1/2">
              <ClientWorkoutScreen />
              <p className="mt-3 text-center text-sm text-charcoal/80">Your workout, set by set</p>
            </div>
          </Reveal>

          <div>
            <SectionHeading
              id="for-clients-title"
              eyebrow="For clients"
              title="Know exactly what today looks like."
              lede={
                <span className="text-charcoal/80">
                  Your plan, your progress and your coach, <Mark>in one place</Mark>.
                </span>
              }
            />

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="rounded-2xl bg-cream p-5 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-cream">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {benefit.icon}
                    </svg>
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-forest">{benefit.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-6 text-charcoal/80">{benefit.body}</p>
                </li>
              ))}
            </ul>

            <p className="mt-6 rounded-2xl border-2 border-dashed border-forest/25 px-5 py-4 text-[15px] leading-6 text-charcoal/80">
              <span className="font-display font-bold text-forest">No coach yet?</span> Find one in{' '}
              <Mark>Explore</Mark> and send a request.
            </p>

            <button
              type="button"
              onClick={() => earlyAccess.openFor('CLIENT')}
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 py-3 text-base font-semibold text-cream shadow-card transition hover:bg-forest-deep"
            >
              Join early access as a client
              <Arrow />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}

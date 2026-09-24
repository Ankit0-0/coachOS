'use client';

import type { ReactNode } from 'react';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { ClientTodayScreen, ClientWorkoutScreen } from '@/components/mockups/app-screens';
import { Arrow, Container, Reveal, SectionHeading } from '@/components/ui';

const benefits: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Open the app, see today',
    body: "Today's workout and meals, straight from your coach's plan. No scrolling back through chats for the latest PDF.",
    icon: <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />,
  },
  {
    title: 'Tick it off as you go',
    body: 'Mark each set and meal done, and leave a note on a set if something felt off. Your coach sees it.',
    icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  },
  {
    title: 'Log progress in seconds',
    body: "Add today's weight and a photo. Your history shows the trend, so a slow week doesn't feel like no progress.",
    icon: <path d="M4 18l5-6 4 3 7-8M15 7h5v5" />,
  },
  {
    title: 'Stay in touch with your coach',
    body: 'Everything you log shows up on your coach’s side, and you can message them on WhatsApp from the app.',
    icon: <path d="M4 5h16v11H9l-5 4z" />,
  },
];

export function ForClientsSection() {
  const earlyAccess = useEarlyAccess();

  return (
    <section id="for-clients" aria-labelledby="for-clients-title" className="bg-sage/60 py-20 sm:py-28">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">
          <Reveal className="order-last mx-auto flex w-full max-w-[30rem] items-start justify-center gap-4 lg:sticky lg:top-24 lg:order-first">            <div className="mt-10 w-1/2">
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
                  Having a plan is one thing. Following it on a busy Tuesday is another. CoachOS keeps your plan, your
                  progress and your coach in one place, so the next step is always clear.
                </span>
              }
            />

            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="rounded-2xl bg-cream p-5 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-cream">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {benefit.icon}
                    </svg>
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-forest">{benefit.title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-charcoal/80">{benefit.body}</p>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border-2 border-dashed border-forest/25 p-5">
              <p className="font-display font-bold text-forest">Don&apos;t have a coach yet?</p>
              <p className="mt-1 text-[15px] leading-6 text-charcoal/80">
                Browse coaches in Explore, see what they specialise in, and send a request to the one that fits your
                goals and routine.
              </p>
            </div>

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

'use client';

import type { ReactNode } from 'react';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { CoachClientDetailScreen, CoachClientsScreen } from '@/components/mockups/app-screens';
import { Arrow, Container, Mark, Reveal, SectionHeading } from '@/components/ui';

/** A coaching day, moment by moment: how it goes now, and with CoachOS. */
const day: { moment: string; before: string; after: ReactNode }[] = [
  {
    moment: 'Morning check-ins',
    before: 'Scroll a dozen chats',
    after: (
      <>
        See <Mark>who trained</Mark> in one tap
      </>
    ),
  },
  {
    moment: 'New client',
    before: 'Copy and edit an old PDF',
    after: (
      <>
        Invite, then <Mark>assign a plan</Mark>
      </>
    ),
  },
  {
    moment: 'Plan change',
    before: 'Re-send a new file',
    after: (
      <>
        Edit once, <Mark>one version</Mark>
      </>
    ),
  },
  {
    moment: 'Progress review',
    before: 'Dig through gallery and sheet',
    after: (
      <>
        <Mark>Trend and photos</Mark> on one screen
      </>
    ),
  },
  {
    moment: 'Renewals',
    before: 'Check the sheet, remember to ask',
    after: (
      <>
        <Mark>Subscription dates</Mark> on each client
      </>
    ),
  },
];

export function ForCoachesSection() {
  const earlyAccess = useEarlyAccess();

  return (
    <section id="for-coaches" aria-labelledby="for-coaches-title" className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="for-coaches-title"
          eyebrow="For coaches"
          title="Spend your day coaching, not chasing."
          lede={
            <>
              Clients, plans and check-ins <Mark>in one place</Mark>. Less searching, more coaching.
            </>
          }
        />

        <div className="mt-12 grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-16">
          {/* Before and after, one row per moment of the day. */}
          <div className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-card">
            <div className="hidden grid-cols-[9rem_1fr_1fr] border-b border-forest/10 bg-cream text-sm font-semibold sm:grid">
              <span className="px-5 py-3 text-muted">Moment</span>
              <span className="px-5 py-3 text-terracotta-deep">Today</span>
              <span className="px-5 py-3 text-forest">With CoachOS</span>
            </div>
            <ol>
              {day.map((row) => (
                <li key={row.moment} className="grid gap-2 border-b border-forest/10 px-5 py-5 last:border-0 sm:grid-cols-[9rem_1fr_1fr] sm:gap-0 sm:px-0 sm:py-0">
                  <p className="font-display text-sm font-bold text-forest sm:px-5 sm:py-5">{row.moment}</p>
                  <p className="text-[15px] leading-6 text-muted sm:px-5 sm:py-5">
                    <span className="mr-1 font-semibold text-terracotta-deep sm:hidden">Today:</span>
                    <span className="line-through decoration-terracotta/50">{row.before}</span>
                  </p>
                  <p className="rounded-xl bg-sage-soft px-3 py-2 text-[15px] leading-6 text-charcoal sm:rounded-none sm:px-5 sm:py-5">
                    <span className="mr-1 font-semibold text-forest sm:hidden">With CoachOS:</span>
                    {row.after}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <Reveal className="mx-auto flex w-full max-w-[30rem] items-start justify-center gap-4 lg:sticky lg:top-24">
            <div className="w-1/2">
              <CoachClientsScreen />
              <p className="mt-3 text-center text-sm text-muted">Your roster</p>
            </div>
            <div className="mt-10 w-1/2">
              <CoachClientDetailScreen />
              <p className="mt-3 text-center text-sm text-muted">One client, at a glance</p>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => earlyAccess.openFor('COACH')}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 py-3 text-base font-semibold text-cream shadow-card transition hover:bg-forest-deep"
          >
            Join early access as a coach
            <Arrow />
          </button>
          <p className="text-sm text-muted">Just your email and phone type.</p>
        </div>
      </Container>
    </section>
  );
}

'use client';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { CoachClientDetailScreen, CoachClientsScreen } from '@/components/mockups/app-screens';
import { Arrow, Container, Reveal, SectionHeading } from '@/components/ui';

/** A coaching day, moment by moment: how it goes now, and with CoachOS. */
const day = [
  {
    moment: 'Morning check-ins',
    before: 'Scroll through a dozen chats to see who trained and who went quiet.',
    after: "Open a client and see yesterday's ticked sets and meals.",
  },
  {
    moment: 'A new client signs up',
    before: 'Copy last month’s PDF, change the name, and hope nothing old is left in it.',
    after: 'Invite them by email and assign a plan from your library.',
  },
  {
    moment: 'The plan needs a change',
    before: "Edit the file, re-send it, and explain which version is the current one.",
    after: 'Edit the plan once. There is only ever one version.',
  },
  {
    moment: 'Weekly progress review',
    before: 'Dig through your gallery for this week’s photos and a spreadsheet for weights.',
    after: 'Weight trend, check-in calendar and photos on one screen.',
  },
  {
    moment: 'Renewals',
    before: 'Check the sheet, and remember to ask.',
    after: "Each client's subscription period sits on their page.",
  },
];

export function ForCoachesSection() {
  const earlyAccess = useEarlyAccess();

  return (
    <section id="for-coaches" aria-labelledby="for-coaches-title" className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          id="for-coaches-title"
          eyebrow="For coaches"
          title="Spend your day coaching, not chasing."
          lede="Your clients, their plans and their check-ins, organised the way you already work. Less time searching, more time on the part only you can do."
        />

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-16">
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
                    {row.before}
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
          <p className="text-sm text-muted">Takes your email and phone type. Nothing else.</p>
        </div>
      </Container>
    </section>
  );
}

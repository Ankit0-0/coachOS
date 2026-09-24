import type { ReactNode } from 'react';

import { Container, Reveal, SectionHeading } from '@/components/ui';

/**
 * Only what the apps do today (mobile/coaches, mobile/clients). Anything not
 * built yet — payments, in-app chat, reminders — stays off this list.
 */
const features: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Client management',
    body: 'One roster of everyone you coach and everyone you have invited, with each client’s goals, plans and history a tap away.',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M15.5 4.8a3.4 3.4 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
      </>
    ),
  },
  {
    title: 'Workout and diet plans',
    body: 'Build plans that repeat over 1 to 31 days: sets, reps and rest for workouts, meals and calories for diets. Or start from a shared library of ready-made plans.',
    icon: <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6" />,
  },
  {
    title: 'Plan assignment',
    body: 'Give a client a workout plan and a diet plan in a few taps. The app works out which day of the plan falls today.',
    icon: <path d="M4 12h11M11 7l5 5-5 5M20 4v16" />,
  },
  {
    title: 'Check-ins and progress',
    body: 'Clients tick off sets and meals, add meal photos, and log weight and physique photos. Coaches see a weight trend and a monthly check-in calendar.',
    icon: <path d="M4 18l5-6 4 3 7-8M15 7h5v5" />,
  },
  {
    title: 'Coach–client connection',
    body: 'Invite clients by email with a subscription length, or accept requests. Clients can reach their coach on WhatsApp straight from the app.',
    icon: <path d="M4 5h16v11H9l-5 4zM8.5 10.5h7" />,
  },
  {
    title: 'Explore coaches',
    body: 'Clients can browse approved coaches who have chosen to be listed, and send a request to work with one.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="border-t border-forest/10 bg-white/60 py-20 sm:py-28">
      <Container>
        <SectionHeading
          id="features-title"
          eyebrow="What's inside"
          title="What a coaching week needs, and nothing it doesn't."
          lede="Each feature does one everyday job well. Here's what's in the app today."
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <li key={feature.title}>
              <Reveal delay={(index % 3) * 0.06} className="h-full rounded-3xl border border-forest/10 bg-cream p-6 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage text-forest">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {feature.icon}
                  </svg>
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-forest">{feature.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-charcoal/80">{feature.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

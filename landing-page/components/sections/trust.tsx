import type { ReactNode } from 'react';

import { Check, Container, Mark, Reveal, SectionHeading } from '@/components/ui';

/*
  No testimonials, user counts or ratings here: CoachOS hasn't launched, so
  there are none to show. This section says how it's designed instead.
*/
const principles: { title: string; body: ReactNode; points: string[] }[] = [
  {
    title: 'The coach stays at the centre',
    body: (
      <>
        Plans come from your coach. <Mark tone="dark">No medical or diet advice</Mark> from the app.
      </>
    ),
    points: ['Plans come only from the coach', 'Progress goes back to the coach'],
  },
  {
    title: 'Private between coach and client',
    body: (
      <>
        Check-ins and photos are <Mark tone="dark">shared only with your coach</Mark>.
      </>
    ),
    points: ['Photos stored privately', 'Explore listing is opt-in'],
  },
  {
    title: 'Fits how you already work',
    body: (
      <>
        Keep WhatsApp for talking. <Mark tone="dark">Plans and progress</Mark> live in CoachOS.
      </>
    ),
    points: ['WhatsApp link built in', 'Android and iPhone'],
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="bg-forest py-16 text-cream sm:py-24">
      <Container>
        <SectionHeading
          id="trust-title"
          tone="dark"
          eyebrow="Designed around real coaching routines"
          title="Built to support the coach, not replace them."
          lede={
            <>
              CoachOS handles the admin. <Mark tone="dark">The coaching stays with the coach.</Mark>
            </>
          }
        />

        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {principles.map((principle, index) => (
            <li key={principle.title}>
              <Reveal delay={index * 0.08} className="h-full rounded-3xl bg-cream/[0.06] p-6 ring-1 ring-cream/15 sm:p-7">
                <h3 className="font-display text-xl font-bold text-cream">{principle.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-cream/80">{principle.body}</p>
                <ul className="mt-5 space-y-2">
                  {principle.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-sm font-medium text-cream">
                      <Check />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

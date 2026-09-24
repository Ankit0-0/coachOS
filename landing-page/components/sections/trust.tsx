import { Check, Container, Reveal, SectionHeading } from '@/components/ui';

/*
  No testimonials, user counts or ratings here: CoachOS hasn't launched, so
  there are none to show. This section says how it's designed instead.
*/
const principles = [
  {
    title: 'The coach stays at the centre',
    body: 'CoachOS doesn’t write plans, and it doesn’t give medical or diet advice. Every plan a client sees comes from their coach. The app just delivers it and keeps track.',
    points: ['Plans come only from the coach', 'Progress goes back to the coach'],
  },
  {
    title: 'Private between coach and client',
    body: 'A client’s check-ins and photos are shown to the coach they’ve connected with, not to other coaches or clients. Coaches choose whether they appear in Explore.',
    points: ['Photos stored privately', 'Explore listing is opt-in'],
  },
  {
    title: 'Fits how you already work',
    body: 'Keep WhatsApp for conversation. CoachOS takes the plans, check-ins and progress out of the chat, so they don’t get lost in it.',
    points: ['WhatsApp link built in', 'Android and iPhone'],
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="bg-forest py-20 text-cream sm:py-28">
      <Container>
        <SectionHeading
          id="trust-title"
          tone="dark"
          eyebrow="Designed around real coaching routines"
          title="Built to support the coach, not replace them."
          lede="Good coaching is a relationship. CoachOS handles the admin around it and leaves the coaching to the coach."
        />

        <ul className="mt-14 grid gap-5 lg:grid-cols-3">
          {principles.map((principle, index) => (
            <li key={principle.title}>
              <Reveal delay={index * 0.08} className="h-full rounded-3xl bg-cream/[0.06] p-6 ring-1 ring-cream/15 sm:p-7">
                <h3 className="font-display text-xl font-bold text-cream">{principle.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-cream/80">{principle.body}</p>
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

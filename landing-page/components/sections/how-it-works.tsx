import type { ReactNode } from 'react';

import { Container, Reveal, SectionHeading } from '@/components/ui';

type Step = { who: 'Coach' | 'Client'; title: string; body: string; visual: ReactNode };

const steps: Step[] = [
  {
    who: 'Coach',
    title: 'Set up the client and assign a plan',
    body: 'Invite a client by email, or accept a request from Explore. Pick a workout and a diet plan from your library, or build your own cycle of 1 to 31 days.',
    visual: <AssignVisual />,
  },
  {
    who: 'Client',
    title: 'Follow the plan and check in',
    body: "Each day the app shows that day of the plan. The client ticks off sets and meals, adds meal photos, and logs weight when they weigh in.",
    visual: <CheckInVisual />,
  },
  {
    who: 'Coach',
    title: 'Review, then adjust',
    body: "See the week's check-ins, the weight trend and photos together. Change the plan where it needs changing, and the client sees the new version.",
    visual: <ReviewVisual />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          id="how-it-works-title"
          align="center"
          eyebrow="How it works"
          title="Three steps, repeated every week."
          lede="Coach and client each have their own app, both working from the same plan."
        />

        <ol className="relative mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 0.08} className="flex h-full flex-col rounded-3xl border border-forest/10 bg-white p-6 shadow-card sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-cream">
                    {index + 1}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      step.who === 'Coach' ? 'bg-sage text-forest' : 'bg-terracotta-soft text-terracotta-deep'
                    }`}
                  >
                    {step.who}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-forest">{step.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-6 text-charcoal/80">{step.body}</p>
                <div aria-hidden="true" className="mt-6 rounded-2xl bg-cream p-4">
                  {step.visual}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* Small illustrative fragments, one per step. Decorative: the text carries the step. */

function AssignVisual() {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-forest/10">
        <span className="font-semibold text-charcoal">Priya Sharma</span>
        <span className="text-xs text-muted">3 months</span>
      </div>
      {[
        ['Workout', 'Push / pull / legs · 7 days'],
        ['Diet', 'Home-style veg · 7 days'],
      ].map(([kind, plan]) => (
        <div key={kind} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-forest/10">
          <span className="rounded-md bg-sage px-1.5 py-0.5 text-[11px] font-semibold text-forest">{kind}</span>
          <span className="truncate text-charcoal/85">{plan}</span>
          <span className="ml-auto text-xs font-semibold text-forest">Assigned</span>
        </div>
      ))}
    </div>
  );
}

function CheckInVisual() {
  const items = [
    ['Bench press · 4 sets', true],
    ['Breakfast: poha, curd', true],
    ['Lunch: dal, 2 roti, sabzi', false],
  ] as const;
  return (
    <ul className="space-y-2 text-sm">
      {items.map(([label, done]) => (
        <li key={label} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 ring-1 ring-forest/10">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              done ? 'border-forest bg-forest text-cream' : 'border-muted/60'
            }`}
          >
            {done ? (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6.2l2.2 2.2 4.8-5" />
              </svg>
            ) : null}
          </span>
          <span className={done ? 'text-muted line-through decoration-muted/50' : 'text-charcoal'}>{label}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewVisual() {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-forest/10">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-charcoal">This week</span>
        <span className="text-xs text-muted">5 of 6 days checked in</span>
      </div>
      <div className="mt-3 flex h-12 items-end gap-1.5">
        {[70, 90, 55, 100, 0, 85, 95].map((height, index) => (
          <span
            key={index}
            className={`flex-1 rounded-t-md ${height ? 'bg-forest/80' : 'bg-forest/10'}`}
            style={{ height: `${Math.max(height, 12)}%` }}
          />
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-terracotta-soft px-2.5 py-1.5 text-xs text-charcoal">
        Plan updated: lighter legs day, extra rest on Friday
      </p>
    </div>
  );
}

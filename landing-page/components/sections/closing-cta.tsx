'use client';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { Arrow, Container, Mark } from '@/components/ui';

const paths = [
  {
    audience: 'COACH' as const,
    label: 'For coaches',
    title: 'Get your clients, plans and check-ins in one place.',
    button: 'Join early access as a coach',
  },
  {
    audience: 'CLIENT' as const,
    label: 'For clients',
    title: 'Know what today looks like, and keep your coach in the loop.',
    button: 'Join early access as a client',
  },
];

export function ClosingCta() {
  const earlyAccess = useEarlyAccess();

  return (
    <section aria-labelledby="closing-title" className="pb-20 sm:pb-28">
      <Container>
        <div className="rounded-[2rem] bg-sage px-6 py-12 sm:px-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="closing-title" className="text-balance font-display text-3xl font-extrabold tracking-tight text-forest sm:text-5xl">
              Less chasing. Clearer days.
            </h2>
            <p className="text-pretty mt-4 text-lg leading-8 text-charcoal/85">
              Pre-launch. <Mark>Join early access</Mark> and we&apos;ll email you when it&apos;s ready.
            </p>
          </div>

          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
            {paths.map((path) => (
              <li key={path.audience} className="flex flex-col rounded-3xl bg-cream p-6 shadow-card sm:p-8">
                <p className="text-sm font-semibold text-terracotta-deep">{path.label}</p>
                <p className="mt-2 flex-1 font-display text-xl font-bold leading-snug text-forest">{path.title}</p>
                <button
                  type="button"
                  onClick={() => earlyAccess.openFor(path.audience)}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-base font-semibold text-cream transition hover:bg-forest-deep"
                >
                  {path.button}
                  <Arrow />
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-center text-sm text-charcoal/80">Just your email and phone type. No newsletters.</p>
        </div>
      </Container>
    </section>
  );
}

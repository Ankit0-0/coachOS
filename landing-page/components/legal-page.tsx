import type { ReactNode } from 'react';

import { Footer } from '@/components/footer';
import { Wordmark } from '@/components/navbar';
import { Container } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/lib/site';

/**
 * The frame for the privacy policy, terms and account-deletion pages: a plain
 * header back to the home page, one readable column, the site footer.
 */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-forest/10 bg-cream">
        <Container className="flex h-16 items-center">
          <a href="/" aria-label="CoachOS home">
            <Wordmark />
          </a>
        </Container>
      </header>
      <main id="main" className="bg-cream py-12 sm:py-16">
        <Container>
          <article className="mx-auto max-w-3xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-forest sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
            <div className="mt-6 text-lg leading-8 text-charcoal/80">{intro}</div>
            <div className="mt-10 space-y-10">{children}</div>
          </article>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-forest">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-7 text-charcoal/85">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-terracotta">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function EmailLink({ subject }: { subject?: string }) {
  const href = `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return (
    <a href={href} className="font-semibold text-terracotta-deep underline decoration-terracotta/40 underline-offset-2 hover:decoration-terracotta">
      {SUPPORT_EMAIL}
    </a>
  );
}

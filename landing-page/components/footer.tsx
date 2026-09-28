'use client';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { Wordmark } from '@/components/navbar';
import { Container } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/lib/site';

// From the home page these scroll; from the legal pages they go home first.
const productLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#for-coaches', label: 'For coaches' },
  { href: '/#for-clients', label: 'For clients' },
  { href: '/#faq', label: 'FAQ' },
];

const companyLinks = [
  { href: `mailto:${SUPPORT_EMAIL}`, label: 'Contact' },
  { href: '/privacy/', label: 'Privacy policy' },
  { href: '/terms/', label: 'Terms of use' },
  { href: '/delete-account/', label: 'Delete your account' },
];

export function Footer() {
  const earlyAccess = useEarlyAccess();

  return (
    <footer className="bg-forest-deep text-cream">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark tone="cream" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-cream/75">
            Client plans, progress and check-ins in one place, for online fitness coaches and the people they coach.
          </p>
          <button
            type="button"
            onClick={earlyAccess.open}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-cream px-5 text-sm font-semibold text-forest transition hover:bg-sage"
          >
            Join early access
          </button>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-cream">Product</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {productLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-cream/75 transition hover:text-cream">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-cream">Company</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-cream/75 transition hover:text-cream">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-cream/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-cream/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} CoachOS</p>
          <p>CoachOS is in pre-launch and not yet available in app stores.</p>
        </Container>
      </div>
    </footer>
  );
}

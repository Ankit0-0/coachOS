import type { Metadata, Viewport } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';

import { EarlyAccessProvider } from '@/components/early-access/early-access-provider';
import './globals.css';

/**
 * Scroll reveals (.reveal in globals.css), run inline in <head> so they work
 * before — and without — React. It tags <html> so the CSS may hide .reveal
 * elements at all, then shows each one as it scrolls into view. Without
 * JavaScript or IntersectionObserver nothing is ever hidden.
 */
const revealScript = `(function () {
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-reveal');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -60px 0px' });
  function observeAll() {
    document.querySelectorAll('.reveal').forEach(function (element) { observer.observe(element); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeAll);
  else observeAll();
})();`;

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

const title = 'CoachOS — Coaching, without the chaos';
const description =
  'Client plans, progress and check-ins in one place — so online fitness coaches can focus on coaching and clients know what to do next. Join early access.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    url: 'https://coachos.example.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CoachOS' }],
  },
  twitter: { card: 'summary_large_image', title, description },
};

export const viewport: Viewport = {
  themeColor: '#F7F5EF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The reveal script adds a class to <html> before React hydrates.
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: revealScript }} />
      </head>
      <body>
        {/* One early-access modal for every call to action on the page. */}
        <EarlyAccessProvider>{children}</EarlyAccessProvider>
      </body>
    </html>
  );
}

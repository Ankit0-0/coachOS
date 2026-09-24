'use client';

import { useEffect, useId, useState } from 'react';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

const links = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-coaches', label: 'For coaches' },
  { href: '#for-clients', label: 'For clients' },
  { href: '#faq', label: 'FAQ' },
];

export function Wordmark({ tone = 'forest' }: { tone?: 'forest' | 'cream' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${tone === 'cream' ? 'text-cream' : 'text-forest'}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="8" className={tone === 'cream' ? 'fill-cream' : 'fill-forest'} />
        <path d="M17.5 9.2a5.5 5.5 0 100 7.6" fill="none" stroke="#C96F4A" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      CoachOS
    </span>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const earlyAccess = useEarlyAccess();
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A phone-width menu left open shouldn't survive a resize to desktop.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => query.matches && setMenuOpen(false);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled || menuOpen ? 'border-b border-forest/10 bg-cream/95 backdrop-blur' : 'border-b border-transparent bg-cream'
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to content
      </a>
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <a href="#top" aria-label="CoachOS, back to top">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-[15px] font-medium text-charcoal/80 transition hover:text-forest">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={earlyAccess.open}
            className="inline-flex min-h-11 items-center rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-forest-deep sm:px-5"
          >
            Join early access
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest hover:bg-sage md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 6h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </nav>

      <div id={menuId} hidden={!menuOpen} className="border-t border-forest/10 px-5 pb-5 pt-2 md:hidden">
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="block rounded-lg px-2 py-3 text-base font-medium text-charcoal hover:bg-sage-soft"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

const links = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-coaches', label: 'For Coaches' }
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const earlyAccess = useEarlyAccess();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-ink/80 backdrop-blur-xl' : 'bg-transparent'}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#top" className="text-lg font-semibold tracking-[0.28em] text-cream uppercase">
          CoachOS
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted transition hover:text-cream">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={earlyAccess.open}
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cream transition hover:border-accent/40 hover:bg-accent/10 md:inline-flex"
          >
            Join Early Access
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 text-cream md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <span className="block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </nav>

      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-white/10 bg-ink/95 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-muted" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="inline-flex justify-center rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
              onClick={() => {
                // The menu covers the page, so it closes as the modal opens.
                setOpen(false);
                earlyAccess.open();
              }}
            >
              Join Early Access
            </button>
          </div>
        </motion.div>
      )}
    </header>
  );
}

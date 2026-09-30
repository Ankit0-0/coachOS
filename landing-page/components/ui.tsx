'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';

import { AppChooserModal } from '@/components/app-chooser-modal';
import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { WEB_APPS } from '@/lib/web-apps';

/** The page's one content width, so every section's edges line up. */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  tone = 'light',
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  /** `dark` for a heading sitting on forest. */
  tone?: 'light' | 'dark';
  /** Set on the h2 so a section can be labelled by it. */
  id?: string;
}) {
  const centered = align === 'center';
  const dark = tone === 'dark';
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className={`text-sm font-semibold ${dark ? 'text-terracotta-soft' : 'text-terracotta-deep'}`}>{eyebrow}</p>
      ) : null}
      <h2
        id={id}
        className={`text-balance mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl ${
          dark ? 'text-cream' : 'text-forest'
        }`}
      >
        {title}
      </h2>
      {lede ? (
        <p className={`text-pretty mt-4 text-lg leading-8 ${dark ? 'text-cream/80' : 'text-muted'}`}>{lede}</p>
      ) : null}
    </div>
  );
}

/**
 * A highlighter stroke behind the key phrase of a line, so the page can be
 * skimmed: someone who reads only the marked words still gets the point.
 * Use it once or twice per block, not on whole sentences.
 */
export function Mark({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <mark
      className={`box-decoration-clone rounded-[0.15em] bg-transparent px-[0.1em] font-semibold ${
        tone === 'dark'
          ? 'bg-[linear-gradient(transparent_62%,rgba(201,111,74,0.55)_62%)] text-cream'
          : 'bg-[linear-gradient(transparent_55%,#F4D4C2_55%)] text-forest'
      }`}
    >
      {children}
    </mark>
  );
}

/**
 * Fades content up as it scrolls into view — see .reveal in globals.css and
 * the script in layout.tsx. The script adds .is-visible before React
 * hydrates, hence suppressHydrationWarning.
 */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

const primaryButton =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-base font-semibold text-cream shadow-card transition hover:bg-forest-deep';
const secondaryButton =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-forest/20 bg-white/60 px-6 py-3 text-base font-semibold text-forest transition hover:border-forest/50 hover:bg-white';

/**
 * The hero's two ways in: early access with no audience chosen, and the web
 * apps. Until both web-app URLs are set, only early access shows.
 */
export function HeroActions({ className = '' }: { className?: string }) {
  const earlyAccess = useEarlyAccess();
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const webAppButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeChooser = useCallback(() => {
    setIsChooserOpen(false);
    // Back to the button that opened it, as the early-access modal does.
    webAppButtonRef.current?.focus();
  }, []);

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={earlyAccess.open} className={primaryButton}>
          Join early access
          <Arrow />
        </button>
        {WEB_APPS ? (
          <button
            ref={webAppButtonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsChooserOpen(true)}
            className={secondaryButton}
          >
            Open the web app
            <Arrow />
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-muted">
        {WEB_APPS
          ? 'Not in the app stores yet — use the web app or join early access.'
          : "Not in the app stores yet — join early access and we'll email you."}
      </p>
      {WEB_APPS ? <AppChooserModal isOpen={isChooserOpen} apps={WEB_APPS} onClose={closeChooser} /> : null}
    </div>
  );
}

export function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="9" cy="9" r="9" className="fill-sage" />
      <path d="M5.5 9.2l2.3 2.3 4.7-5" fill="none" stroke="#183B32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="9" cy="9" r="9" className="fill-terracotta-soft" />
      <path d="M6.2 6.2l5.6 5.6M11.8 6.2l-5.6 5.6" stroke="#A2502E" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

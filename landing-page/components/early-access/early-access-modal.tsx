'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { EarlyAccessError, isValidEmail, submitEarlyAccess, type DevicePlatform } from '@/lib/early-access';

type EarlyAccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PLATFORMS: { value: DevicePlatform; label: string; hint: string }[] = [
  { value: 'IOS', label: 'iPhone', hint: 'iOS' },
  { value: 'ANDROID', label: 'Android', hint: 'Play Store' },
];

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function EarlyAccessModal({ isOpen, onClose }: EarlyAccessModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const errorId = useId();

  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState<DevicePlatform | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // A fresh form each time it opens, and focus inside it.
  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setPlatform(null);
    setStatus('idle');
    setError(null);
    const focusTimer = window.setTimeout(() => emailInputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  // The page behind must not scroll while this is over it.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  /** Keeps Tab inside the modal: nothing behind it should be reachable. */
  const trapFocus = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    // Checked here so a mistake is answered instantly, without a round trip.
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (!platform) {
      setError('Choose iPhone or Android.');
      return;
    }

    setError(null);
    setStatus('sending');
    try {
      await submitEarlyAccess({ email, platform });
      setStatus('done');
    } catch (caught) {
      setStatus('idle');
      setError(caught instanceof EarlyAccessError ? caught.message : 'Something went wrong. Please try again.');
    }
  }

  const duration = prefersReducedMotion ? 0 : 0.28;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[100] overflow-y-auto bg-ink/95 backdrop-blur-sm"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration }}
          // A press anywhere outside the panel closes it — including on the
          // centring wrapper, which covers the whole backdrop.
          onMouseDown={(event) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
          }}
          onKeyDown={trapFocus}
        >
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative w-full max-w-lg rounded-[2rem] border border-line bg-panel p-6 shadow-glow sm:p-10"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration, ease: 'easeOut' }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-5 top-5 rounded-full border border-line p-2 text-muted transition hover:border-accent/40 hover:text-cream"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>

              {status === 'done' ? (
                <SignupConfirmation platform={platform} titleId={titleId} reduceMotion={Boolean(prefersReducedMotion)} />
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Early access</p>
                  <h2 id={titleId} className="mt-4 text-2xl font-semibold text-cream sm:text-3xl">
                    Get CoachOS first.
                  </h2>
                  <p className="mt-3 text-base leading-7 text-muted">
                    Leave your email and we&apos;ll tell you the day it lands on your phone.
                  </p>

                  <label htmlFor="early-access-email" className="mt-8 block text-sm font-medium text-cream">
                    Email address
                  </label>
                  <input
                    id="early-access-email"
                    ref={emailInputRef}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-2 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-cream outline-none transition placeholder:text-muted focus:border-accent/60"
                  />

                  <p className="mt-6 text-sm font-medium text-cream" id="early-access-platform-label">
                    Which phone do you use?
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="early-access-platform-label">
                    {PLATFORMS.map((option) => {
                      const isSelected = platform === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setPlatform(option.value);
                            setError(null);
                          }}
                          className={`rounded-2xl border px-4 py-5 text-left transition ${
                            isSelected
                              ? 'border-accent bg-accent/10'
                              : 'border-line bg-ink hover:border-accent/40 hover:bg-white/5'
                          }`}
                        >
                          <span className={`block text-base font-semibold ${isSelected ? 'text-accent' : 'text-cream'}`}>
                            {option.label}
                          </span>
                          <span className="mt-1 block text-sm text-muted">{option.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {error ? (
                    <p id={errorId} role="alert" className="mt-5 text-sm text-red-400">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {status === 'sending' ? 'Joining…' : 'Join early access'}
                  </button>
                  <p className="mt-4 text-center text-xs text-muted">No spam. One email when it&apos;s ready.</p>
                </form>
              )}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** What replaces the form once the signup is in: a tick, and two lines. */
function SignupConfirmation({
  platform,
  titleId,
  reduceMotion,
}: {
  platform: DevicePlatform | null;
  titleId: string;
  reduceMotion: boolean;
}) {
  const store = platform === 'ANDROID' ? 'Android' : 'iPhone';

  return (
    <div className="py-6 text-center">
      <motion.svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        className="mx-auto text-accent"
        aria-hidden="true"
        initial={reduceMotion ? undefined : 'hidden'}
        animate={reduceMotion ? undefined : 'shown'}
      >
        <motion.circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="2"
          variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        <motion.path
          d="M19 33.5l9 9 17-19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        />
      </motion.svg>

      <h2 id={titleId} className="mt-6 text-2xl font-semibold text-cream sm:text-3xl">
        You&apos;re on the list
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">
        We&apos;ll email you the moment CoachOS is ready on {store}.
      </p>
    </div>
  );
}

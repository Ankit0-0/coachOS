'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  /** The id of the modal's heading. */
  labelledBy: string;
  /** Focused on open; the first control after the close button otherwise. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * The frame both modals share: backdrop, panel, close button, Escape and
 * backdrop dismiss, focus trap and body-scroll lock. Returning focus to the
 * opener is the caller's job, since only it knows what opened the modal.
 */
export function ModalShell({ isOpen, onClose, labelledBy, initialFocusRef, children }: ModalShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus inside the modal once it has rendered.
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      const fallback = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[1];
      (initialFocusRef?.current ?? fallback)?.focus();
    }, 50);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, initialFocusRef]);

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

  const duration = prefersReducedMotion ? 0 : 0.25;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[100] overflow-y-auto bg-forest-deep/60 backdrop-blur-sm"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration }}
          // A press anywhere outside the panel closes it — including on the
          // centring wrapper, which covers the whole backdrop.
          onMouseDown={(event) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
              // Otherwise the press then moves focus to <body>, after onClose has handed it back.
              event.preventDefault();
              onClose();
            }
          }}
          onKeyDown={trapFocus}
        >
          <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              className="relative w-full max-w-lg rounded-3xl bg-cream p-6 shadow-lift sm:p-9"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              transition={{ duration, ease: 'easeOut' }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-sage hover:text-forest"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {children}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** The two-up grid of option cards both modals use. */
export const optionGridClass = 'grid grid-cols-2 gap-3';

/** One option card; `selected` is the chosen radio in the early-access form. */
export function optionCardClass(selected: boolean): string {
  return `block h-full cursor-pointer rounded-2xl border-2 bg-white px-4 py-3.5 transition ${
    selected ? 'border-forest bg-sage-soft' : 'border-forest/10 hover:border-forest/30'
  }`;
}

/** An option card's text: a marker and label on one line, the hint under it. */
export function OptionText({ marker, label, hint }: { marker: ReactNode; label: string; hint: string }) {
  return (
    <>
      <span className="flex items-center gap-2 text-base font-semibold text-forest">
        {marker}
        {label}
      </span>
      <span className="mt-1 block text-sm leading-5 text-muted">{hint}</span>
    </>
  );
}

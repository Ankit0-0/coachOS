'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { EarlyAccessModal } from '@/components/early-access/early-access-modal';
import type { Audience } from '@/lib/early-access';

type EarlyAccessContextValue = {
  isOpen: boolean;
  /** Opens the form with no audience chosen. Safe to pass straight to onClick. */
  open: () => void;
  /** Opens the form with coach or client already chosen. */
  openFor: (audience: Audience) => void;
  close: () => void;
};

const EarlyAccessContext = createContext<EarlyAccessContextValue | null>(null);

/**
 * One modal for every "Join early access" on the page. Mounted once in the root
 * layout; each call to action calls `open()` or `openFor()` instead of
 * scrolling to an anchor.
 */
export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [audience, setAudience] = useState<Audience | null>(null);
  /** Whatever had focus when the modal opened, so closing can hand it back. */
  const triggerRef = useRef<HTMLElement | null>(null);

  const show = useCallback((chosen: Audience | null) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAudience(chosen);
    setIsOpen(true);
  }, []);

  const open = useCallback(() => show(null), [show]);
  const openFor = useCallback((chosen: Audience) => show(chosen), [show]);

  const close = useCallback(() => {
    setIsOpen(false);
    // Back to the button that opened it, so a keyboard user does not land at
    // the top of the document.
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const value = useMemo(() => ({ isOpen, open, openFor, close }), [isOpen, open, openFor, close]);

  return (
    <EarlyAccessContext.Provider value={value}>
      {children}
      <EarlyAccessModal isOpen={isOpen} initialAudience={audience} onClose={close} />
    </EarlyAccessContext.Provider>
  );
}

export function useEarlyAccess(): EarlyAccessContextValue {
  const context = useContext(EarlyAccessContext);
  if (!context) {
    throw new Error('useEarlyAccess must be used inside <EarlyAccessProvider>');
  }
  return context;
}

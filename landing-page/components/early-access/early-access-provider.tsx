'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { EarlyAccessModal } from '@/components/early-access/early-access-modal';

type EarlyAccessContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const EarlyAccessContext = createContext<EarlyAccessContextValue | null>(null);

/**
 * One modal for every "Join Early Access" on the page. Mounted once in the root
 * layout; each call to action calls `open()` instead of scrolling to an anchor.
 */
export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  /** Whatever had focus when the modal opened, so closing can hand it back. */
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Back to the button that opened it, so a keyboard user does not land at
    // the top of the document.
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <EarlyAccessContext.Provider value={value}>
      {children}
      <EarlyAccessModal isOpen={isOpen} onClose={close} />
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

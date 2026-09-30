'use client';

import { useId, useRef } from 'react';

import { ModalShell, OptionText, optionCardClass, optionGridClass } from '@/components/modal-shell';
import type { WebApps } from '@/lib/web-apps';

type AppChooserModalProps = {
  isOpen: boolean;
  apps: WebApps;
  onClose: () => void;
};

/** Navigation, not a form: pick an app and it opens in a new tab. */
export function AppChooserModal({ isOpen, apps, onClose }: AppChooserModalProps) {
  const titleId = useId();
  const firstOptionRef = useRef<HTMLAnchorElement | null>(null);

  const options = [
    { href: apps.coach, label: "I'm a coach", hint: 'Manage clients and plans' },
    { href: apps.client, label: 'I train with a coach', hint: 'Follow your plan and log check-ins' },
  ];

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} labelledBy={titleId} initialFocusRef={firstOptionRef}>
      <h2 id={titleId} className="pr-10 font-display text-2xl font-bold text-forest sm:text-3xl">
        Open CoachOS
      </h2>
      <p className="mt-2 text-base leading-7 text-muted">Pick the app for how you use CoachOS.</p>

      <ul className={`${optionGridClass} mt-6`}>
        {options.map((option, index) => (
          <li key={option.href}>
            <a
              ref={index === 0 ? firstOptionRef : undefined}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              // The new tab has the app; this one goes back to the page.
              onClick={onClose}
              className={optionCardClass(false)}
            >
              <OptionText label={option.label} hint={option.hint} marker={<NewTabIcon />} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

function NewTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-forest">
      <path
        d="M9 2.5h4.5V7M13.5 2.5 7 9M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

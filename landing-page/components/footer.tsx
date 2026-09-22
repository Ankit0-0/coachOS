"use client";

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

export function Footer() {
  const earlyAccess = useEarlyAccess();

  return (
    <footer className="border-t border-white/10 bg-ink/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-lg font-semibold tracking-[0.28em] text-cream uppercase">CoachOS</p>
          <p className="mt-2">Built for coaches who take coaching seriously.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href="#product" className="transition hover:text-cream">Product</a>
          <button type="button" onClick={earlyAccess.open} className="transition hover:text-cream">
            Early Access
          </button>
          <a href="#" className="transition hover:text-cream">Privacy</a>
          <a href="#" className="transition hover:text-cream">Terms</a>
        </div>
      </div>
    </footer>
  );
}

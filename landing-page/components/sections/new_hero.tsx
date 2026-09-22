"use client";

import Image from 'next/image';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

const row1 = [1, 2, 3];
const row2 = [4, 5, 6];

export function NewHero() {
  const earlyAccess = useEarlyAccess();

  return (
    <section
      id="top"
      className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:gap-4 lg:py-4"
      style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
    >
      {/* Part 1 — eyebrow, heading, subheading */}
      <div className="max-w-3xl">
        <div className="mb-2 inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Built for online fitness coaches
        </div>
        <h1 className="text-xl font-semibold leading-tight text-cream sm:text-2xl lg:text-3xl">
          Your coaching business out of six apps into one
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Stop managing clients across WhatsApp, spreadsheets, PDFs, and five different apps. CoachOS brings your coaching workflow into one simple platform.
        </p>
      </div>

      {/* Part 2 — before / after. Stacked (before on top, after below) on
          mobile; side by side from sm up. The two blocks are sized to match
          each other's total height at each breakpoint — if you resize
          tiles, keep BEFORE's (tile-height * 2 + gap) equal to AFTER's
          fixed height at that same breakpoint. */}
      <div className="mx-auto flex flex-col items-center gap-3 sm:h-[280px] sm:flex-row sm:justify-center sm:gap-4 lg:h-[340px]">
        {/* Before: 3x2 grid of thumbnails */}
        <div className="flex flex-col justify-between gap-1.5 sm:h-full sm:gap-2">
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {row1.map((item) => (
              <div
                key={item}
                className="relative aspect-[3/4] h-24 overflow-hidden rounded-lg border border-white/10 sm:h-[136px] sm:rounded-xl lg:h-[166px]"
              >
                <Image src="/wa_ss.png" alt={`Before ${item}`} fill sizes="130px" className="object-cover object-top" />
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {row2.map((item) => (
              <div
                key={item}
                className="relative aspect-[3/4] h-24 overflow-hidden rounded-lg border border-white/10 sm:h-[136px] sm:rounded-xl lg:h-[166px]"
              >
                <Image src="/wa_ss.png" alt={`Before ${item}`} fill sizes="130px" className="object-cover object-top" />
              </div>
            ))}
          </div>
        </div>

        {/* Arrow: down on mobile (stacked), right from sm up (side by side) */}
        <div className="flex items-center justify-center py-1 sm:w-10 sm:py-0 lg:w-12">
          <span className="text-lg text-accent sm:hidden">↓</span>
          <span className="hidden text-lg text-accent sm:block sm:text-xl">→</span>
        </div>

        {/* After: single larger preview */}
        <div className="relative aspect-[3/4] h-[198px] overflow-hidden rounded-xl border border-white/10 sm:h-full sm:rounded-2xl">
          <Image src="/wa_ss.png" alt="CoachOS dashboard preview" fill sizes="260px" className="object-cover object-top" />
        </div>
      </div>

      {/* Part 3 — CTAs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={earlyAccess.open}
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
        >
          Join Early Access
        </button>
        <a
          href="#how-it-works"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-cream transition hover:border-accent/40 hover:bg-white/5 sm:w-auto"
        >
          See How It Works
        </a>
      </div>
    </section>
  );
}
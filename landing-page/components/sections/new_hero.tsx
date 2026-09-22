"use client";

import type { StaticImageData } from 'next/image';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';
import { Screenshot } from '@/components/screenshot';
import afterShot from '@/public/hero/after.png';
import beforeOne from '@/public/hero/before-1.png';
import beforeTwo from '@/public/hero/before-2.png';
import beforeThree from '@/public/hero/before-3.png';
import beforeFour from '@/public/hero/before-4.png';
import beforeFive from '@/public/hero/before-5.png';
import beforeSix from '@/public/hero/before-6.png';

type HeroScreenshot = { src: StaticImageData; label: string };

/**
 * The six apps a coach juggles today. Every file is a copy of the same
 * placeholder until the real screenshots land — replace the files in
 * public/hero/ and put the real app names in `label`, which is the alt text.
 */
const beforeApps: HeroScreenshot[] = [
  { src: beforeOne, label: 'App 1' },
  { src: beforeTwo, label: 'App 2' },
  { src: beforeThree, label: 'App 3' },
  { src: beforeFour, label: 'App 4' },
  { src: beforeFive, label: 'App 5' },
  { src: beforeSix, label: 'App 6' },
];

/** The one screen that replaces them. Also a placeholder for now. */
const afterApp: HeroScreenshot = { src: afterShot, label: 'CoachOS' };

export function NewHero() {
  const earlyAccess = useEarlyAccess();

  return (
    <section
      id="top"
      // Same container as the navbar, so edges line up with the logo and its button.
      className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:gap-x-12 lg:gap-y-8 lg:px-8 lg:pb-16 lg:pt-10"
      style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
    >
      {/* self-end + self-start below centres the copy and buttons against the visual. */}
      <div className="max-w-4xl lg:col-start-1 lg:row-start-1 lg:max-w-[34rem] lg:self-end">
        <div className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Built for online fitness coaches
        </div>
        <h1 className="text-balance mt-4 text-2xl font-semibold leading-tight text-cream sm:text-3xl lg:text-5xl">
          Your coaching business out of six apps into one
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Stop managing clients across WhatsApp, spreadsheets, PDFs, and five different apps. CoachOS brings your
          coaching workflow into one simple platform.
        </p>
      </div>

      {/* Sized by height, not width — see .hero-visual in globals.css. */}
      {/* Full-column width so cqw stays stable; the row inside aligns right. */}
      <div className="hero-visual mt-6 sm:mt-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
        <div className="hero-visual-row flex items-center justify-start lg:justify-end">
          <div className="hero-tile-grid grid grid-cols-3">
            {beforeApps.map((app, index) => (
              <Screenshot
                key={app.label}
                image={app.src}
                alt={app.label}
                fit="height"
                className="hero-tile rounded-lg sm:rounded-xl"
                sizes="(min-width: 640px) 20vw, 25vw"
                priority={index < 3}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-center text-lg text-accent sm:text-2xl lg:text-3xl" aria-hidden>
            →
          </div>

          <Screenshot
            image={afterApp.src}
            alt={`${afterApp.label} — your coaching workflow in one app`}
            fit="height"
            className="hero-after sm:rounded-2xl"
            sizes="(min-width: 640px) 25vw, 40vw"
            priority
          />
        </div>
      </div>

      {/* One row even on a phone: stacked full-width buttons cost ~50px of height. */}
      <div className="mt-6 flex flex-row flex-wrap items-center gap-3 sm:mt-8 sm:gap-4 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-start">
        <button
          type="button"
          onClick={earlyAccess.open}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 sm:px-6 sm:py-3"
        >
          Join Early Access
        </button>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-cream transition hover:border-accent/40 hover:bg-white/5 sm:px-6 sm:py-3"
        >
          See How It Works
        </a>
      </div>
    </section>
  );
}

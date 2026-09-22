import type { StaticImageData } from 'next/image';

import { Screenshot } from '@/components/screenshot';
import stepOne from '@/public/how-it-works/step-1.png';
import stepTwo from '@/public/how-it-works/step-2.png';
import stepThree from '@/public/how-it-works/step-3.png';
import stepFour from '@/public/how-it-works/step-4.png';
import stepFive from '@/public/how-it-works/step-5.png';

type Step = { src: StaticImageData; label: string };

/**
 * The five screens of the flow. Every file is a copy of the same placeholder
 * until the real screenshots land — replace the files in public/how-it-works/
 * and put what each screen shows in `label`, which is the alt text.
 */
const steps: Step[] = [
  { src: stepOne, label: 'Step 1' },
  { src: stepTwo, label: 'Step 2' },
  { src: stepThree, label: 'Step 3' },
  { src: stepFour, label: 'Step 4' },
  { src: stepFive, label: 'Step 5' },
];

export function HowItWorksSection() {
  return (
    <section
      className="mx-auto max-w-7xl px-2 py-5 sm:px-3 lg:px-4 lg:py-6"
      style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
    >
      <div className="mb-4 max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-accent">How it works</p>
        <h2 className="text-2xl font-semibold text-cream sm:text-3xl lg:text-4xl">
          One place for your coaching flow, from first message to final check-in.
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted sm:text-base">
          Replace scattered notes, screenshots, and follow-up calls with a calm system that keeps everything visible.
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(126,200,255,0.12),_transparent_40%)] p-3 shadow-glow sm:p-4 lg:p-6">
        {/*
          Five screens, still. On a phone they scroll sideways with snapping,
          each card about 70% of the viewport so the next one peeks in and says
          so; from sm up all five sit in one row. No motion of any kind — this
          replaced an autoplaying 3D carousel that cropped every screenshot.
        */}
        <ul className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
          {steps.map((step) => (
            <li key={step.label} className="w-[70vw] shrink-0 snap-center sm:w-auto">
              <Screenshot image={step.src} alt={step.label} sizes="(min-width: 640px) 20vw, 70vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

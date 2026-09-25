import type { ReactNode } from 'react';

import { Container, Cross, Mark, Reveal, SectionHeading } from '@/components/ui';
import {
  CalendarTile,
  FormTile,
  GalleryTile,
  GoogleSheetTile,
  PdfTile,
  StickyNote,
  WhatsAppTile,
} from '@/components/mockups/scattered-tools';

const coachPains: ReactNode[] = [
  <>
    Client info <Mark>scattered across apps</Mark>
  </>,
  <>
    Every plan <Mark>copied from an old PDF</Mark>
  </>,
  <>
    Check-ins <Mark>lost in WhatsApp</Mark>
  </>,
  <>
    Renewals <Mark>depend on reminders</Mark>
  </>,
  <>
    More clients, <Mark>more admin</Mark>
  </>,
];

const clientPains: ReactNode[] = [
  <>
    <Mark>Which workout</Mark> is today?
  </>,
  <>
    The plan is <Mark>buried in the chat</Mark>
  </>,
  <>
    <Mark>No feedback</Mark>, so momentum fades
  </>,
  <>
    Advice that <Mark>ignores your routine</Mark>
  </>,
];

export function ProblemSection() {
  return (
    <section id="problem" aria-labelledby="problem-title" className="border-y border-forest/10 bg-white/60 py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <SectionHeading
            id="problem-title"
            eyebrow="Sound familiar?"
            title="Most coaching runs on WhatsApp, spreadsheets and calendar reminders."
            lede={
              <>
                Plans in PDFs, check-ins in chats, fees in a sheet, follow-ups in a calendar.{' '}
                <Mark>None of it was made for coaching.</Mark>
              </>
            }
          />

          <div className="grid gap-8 sm:grid-cols-2 lg:pt-10">
            <PainList title="If you coach" items={coachPains} />
            <PainList title="If you train with a coach" items={clientPains} />
          </div>
        </div>

        {/* The pile, full width: laid out by .tool-pile in globals.css. */}
        <Reveal className="mt-14 sm:mt-16">
          <div
            role="img"
            aria-label="The tools coaching runs on today: a WhatsApp chat where a client asks which workout is today and the coach points to one of three PDFs, a Google Sheet of client fees with pending payments, a calendar full of client reminders, a phone gallery mixing meal photos, gym selfies and screenshots, a workout plan PDF, a check-in form and a sticky note of to-dos."
          >
            <div aria-hidden="true" className="tool-pile">
              <div className="tool-pile-col">
                <WhatsAppTile className="[grid-area:chat] md:-rotate-1" />
                <FormTile className="[grid-area:form] md:rotate-1" />
              </div>
              <div className="tool-pile-col">
                <GoogleSheetTile className="[grid-area:sheet] md:rotate-[0.6deg]" />
                <PdfTile className="[grid-area:pdf] md:-rotate-1" />
                <StickyNote className="[grid-area:note] rotate-2 md:ml-auto md:w-3/5 md:-rotate-2" />
              </div>
              <div className="tool-pile-col">
                <CalendarTile className="[grid-area:cal] md:rotate-1" />
                <GalleryTile className="[grid-area:gallery] md:-rotate-1" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* The turn: from the pile to one workflow. */}
        <Reveal className="mt-14 sm:mt-16">
          <div className="rounded-3xl bg-forest px-6 py-10 text-center sm:px-12 sm:py-12">
            <p className="text-balance mx-auto max-w-3xl font-display text-2xl font-bold leading-snug text-cream sm:text-3xl">
              CoachOS turns the pile into <Mark tone="dark">one clear workflow</Mark>.
            </p>
            <ol className="mx-auto mt-7 flex max-w-3xl flex-col items-stretch gap-3 text-left sm:flex-row sm:items-center sm:justify-center sm:gap-2">
              {['Plan', 'Check-in', 'Progress', 'Adjust'].map((step, index, all) => (
                <li key={step} className="flex items-center gap-2 sm:contents">
                  <span className="flex flex-1 items-center gap-3 rounded-full bg-cream/10 px-4 py-2.5 text-sm font-semibold text-cream ring-1 ring-cream/15 sm:flex-none">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta text-xs text-white">{index + 1}</span>
                    {step}
                  </span>
                  {index < all.length - 1 ? (
                    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" className="hidden shrink-0 text-cream/50 sm:block">
                      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function PainList({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-forest">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-base leading-6 text-charcoal/85">
            <Cross className="mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

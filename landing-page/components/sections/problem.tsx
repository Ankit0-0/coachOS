import { Container, Cross, Reveal, SectionHeading } from '@/components/ui';
import { ChatTile, FoldersTile, FormTile, GalleryTile, PdfTile, SheetTile, StickyNote } from '@/components/mockups/scattered-tools';

const coachPains = [
  'Client details and progress are spread across several different tools.',
  'Every new plan starts as a copy of an old PDF, edited by hand.',
  'Check-ins arrive in chats and are easy to miss.',
  'Seeing how a client has changed means scrolling back through weeks of messages.',
  'Each new client adds more admin, not just more coaching.',
];

const clientPains = [
  "Not sure which workout is today's.",
  'The plan is a PDF somewhere in the chat.',
  'Without feedback, momentum fades.',
  'Advice that ignores your routine is hard to stick to.',
];

export function ProblemSection() {
  return (
    <section id="problem" aria-labelledby="problem-title" className="border-y border-forest/10 bg-white/60 py-20 sm:py-28">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.25fr] lg:items-center lg:gap-14">
          <div>
            <SectionHeading
              id="problem-title"
              eyebrow="Sound familiar?"
              title="Most coaching runs on chats, spreadsheets and PDFs."
              lede="None of these tools were made for coaching, so the coach ends up holding it all together by hand. It costs time every day, and clients feel the confusion too."
            />

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <PainList title="If you coach" items={coachPains} />
              <PainList title="If you train with a coach" items={clientPains} />
            </div>
          </div>

          {/* The pile. Loose and overlapping from md up; a tidy two-column stack on a phone. */}
          <Reveal>
            <div
              role="img"
              aria-label="A pile of tools: a chat app full of unread client messages, a payments spreadsheet, a workout plan PDF, a check-in form, shared folders, a photo gallery and a sticky note of reminders."
            >
              <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                <ChatTile className="sm:-rotate-2" />
                {/* Full width, and first, in the two-column phone layout. */}
                <SheetTile className="order-first col-span-2 sm:order-none sm:col-span-1 sm:mt-6 sm:rotate-1" />
                <PdfTile className="sm:-rotate-1" />
                <GalleryTile className="sm:-mt-4 sm:rotate-2" />
                <FormTile className="sm:mt-2 sm:-rotate-1" />
                <div className="col-span-2 flex items-start gap-3 sm:col-span-1 sm:flex-col sm:items-stretch sm:gap-4">
                  <FoldersTile className="flex-1 sm:flex-none sm:rotate-1" />
                  <StickyNote className="flex-1 rotate-2 sm:flex-none sm:-rotate-3" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* The turn: from the pile to one workflow. */}
        <Reveal className="mt-16 sm:mt-20">
          <div className="rounded-3xl bg-forest px-6 py-10 text-center sm:px-12 sm:py-12">
            <p className="text-balance mx-auto max-w-3xl font-display text-2xl font-bold leading-snug text-cream sm:text-3xl">
              CoachOS turns the pile into one clear workflow.
            </p>
            <p className="text-pretty mx-auto mt-4 max-w-2xl text-base leading-7 text-cream/80 sm:text-lg">
              The coach sets the plan, the client follows it and checks in, and both see the same progress, all in
              one place.
            </p>
            <ol className="mx-auto mt-8 flex max-w-3xl flex-col items-stretch gap-3 text-left sm:flex-row sm:items-center sm:justify-center sm:gap-2">
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

function PainList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-forest">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-6 text-charcoal/85">
            <Cross className="mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

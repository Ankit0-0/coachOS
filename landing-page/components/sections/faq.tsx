import { Container, SectionHeading } from '@/components/ui';

const faqs = [
  {
    q: 'What is CoachOS?',
    a: 'A pair of mobile apps for online fitness coaching. Coaches use one to manage clients, build and assign workout and diet plans, and review check-ins and progress. Clients use the other to see what today’s plan asks of them, tick it off, and log their progress.',
  },
  {
    q: 'Who is it for?',
    a: 'Online fitness coaches in India who currently run their coaching through WhatsApp, spreadsheets, forms and PDFs, and for the clients they coach.',
  },
  {
    q: 'How do coaches and clients use it together?',
    a: 'The coach invites a client by email (or accepts a request the client sent from Explore) and assigns a workout and a diet plan. Each day the client sees that day of the plan and checks off what they did. The coach sees those check-ins alongside weight and photos, and adjusts the plan when it needs to change.',
  },
  {
    q: 'Is CoachOS available yet?',
    a: 'Not yet. CoachOS is being prepared for Android and iPhone, and it isn’t in the app stores today. Joining early access is how you hear first when it is.',
  },
  {
    q: 'What happens after I join early access?',
    a: 'We save your email and which phone you use. When the app is ready for your phone, we email you. That’s all we use it for: no newsletters. Joining is free.',
  },
  {
    q: 'Does CoachOS replace my coach or give medical advice?',
    a: 'No. Every plan in CoachOS is written by your coach, and the app doesn’t give medical, diet or training advice of its own. If you have a health condition, speak to a doctor before starting a new programme.',
  },
  {
    q: 'I don’t have a coach yet. Can I still use it?',
    a: 'Plans in CoachOS come from a coach, so you’ll need one to follow a plan. The client app’s Explore tab lists coaches who have chosen to be found, and you can send a request to any of them.',
  },
  {
    q: 'Do I have to stop using WhatsApp?',
    a: 'No. Most coaching conversations will still happen there, and the client app links straight to your coach’s WhatsApp. CoachOS just keeps plans, check-ins and progress out of the chat.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions, answered plainly." />

        <div className="divide-y divide-forest/10 border-y border-forest/10">
          {faqs.map((faq) => (
            <details key={faq.q} className="faq-item group">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 font-display text-lg font-bold text-forest">
                {faq.q}
                <span className="faq-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-forest" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-base leading-7 text-charcoal/85">{faq.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

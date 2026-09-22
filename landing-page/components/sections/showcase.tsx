"use client";

import { motion } from 'framer-motion';

const panels = [
  {
    title: 'Clients',
    subtitle: 'Client management',
    body: ['Rahul Sharma', 'Fat loss', 'Check-in due tomorrow'],
    footer: 'Organized at a glance'
  },
  {
    title: 'Workout Templates',
    subtitle: 'Reusable programming',
    body: ['Push Day', 'Bench Press', 'Incline Dumbbell Press', 'Cable Fly'],
    footer: 'Assign to client'
  },
  {
    title: 'Client Progress',
    subtitle: 'Progress tracking',
    body: ['82kg → 78kg', 'Check-in completed', '4 progress photos uploaded'],
    footer: 'See the trend clearly'
  }
];

export function ShowcaseSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="rounded-[2.5rem] border border-white/10 bg-panel/70 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Product showcase</p>
            <h2 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">The future of your coaching workspace.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              Built to feel calm, clear, and serious enough for real coaching businesses.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted">
            Designed for the way real coaches work.
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-3">
          {panels.map((panel, index) => (
            <motion.div key={panel.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.06 }} className="rounded-[1.75rem] border border-white/10 bg-[#0b0f14] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-accent">{panel.subtitle}</p>
              <h3 className="mt-3 text-2xl font-semibold text-cream">{panel.title}</h3>
              <div className="mt-6 space-y-3">
                {panel.body.map((item) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-cream">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-accent/20 bg-accent/10 px-3 py-3 text-sm text-accent">
                {panel.footer}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

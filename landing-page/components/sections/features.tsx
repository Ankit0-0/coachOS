"use client";

import { motion } from 'framer-motion';

const features = [
  {
    title: 'Your Clients. Organized.',
    copy: 'Manage all clients from one clean dashboard without chasing updates through chat threads.',
    accent: 'Clients'
  },
  {
    title: 'Reusable Workout Templates',
    copy: 'Build your best programs once and reuse them across clients with consistency.',
    accent: 'Templates'
  },
  {
    title: 'Personalize Every Program',
    copy: 'Start from a template and customize it for each individual client in seconds.',
    accent: 'Customization'
  },
  {
    title: 'Progress, Without the Spreadsheet',
    copy: 'Track weight, check-ins, measurements, and progress photos without manual cleanup.',
    accent: 'Progress'
  },
  {
    title: 'Video Form Reviews',
    copy: 'Let clients upload exercise videos for you to review whenever you are ready.',
    accent: 'Video reviews'
  },
  {
    title: 'Everything in One Place',
    copy: 'Stop switching between WhatsApp, spreadsheets, PDFs, and multiple apps.',
    accent: 'Unified flow'
  }
];

export function FeaturesSection() {
  return (
    <section id="for-coaches" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Product overview</p>
        <h2 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">A clearer way to run your coaching business.</h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: index * 0.04 }} className="rounded-[1.75rem] border border-white/10 bg-panel/60 p-6">
            <div className="mb-6 inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent">
              {feature.accent}
            </div>
            <h3 className="text-xl font-semibold text-cream">{feature.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{feature.copy}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

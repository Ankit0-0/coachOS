"use client";

import { motion } from 'framer-motion';

const steps = [
  {
    title: 'Onboard your client',
    copy: 'Create a client profile and capture their goals, starting weight, and basic information.'
  },
  {
    title: 'Build their program',
    copy: 'Start from one of your reusable workout templates and customize it for the individual client.'
  },
  {
    title: 'Assign and coach',
    copy: 'Give your client their personalized plan and keep everything organized.'
  },
  {
    title: 'Track progress',
    copy: 'Collect check-ins, weight updates, progress photos, and exercise videos.'
  },
  {
    title: 'Coach better',
    copy: 'Review progress and adjust the plan based on real data.'
  }
];

export function WorkflowSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">How it works</p>
        <h2 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">From onboarding to progress. One workflow.</h2>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => (
          <motion.div key={step.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.05 }} className="rounded-[1.5rem] border border-white/10 bg-panel/60 p-5">
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-sm font-semibold text-accent">
              0{index + 1}
            </div>
            <h3 className="text-xl font-semibold text-cream">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{step.copy}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

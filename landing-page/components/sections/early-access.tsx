"use client";

import { motion } from 'framer-motion';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

export function EarlyAccessSection() {
  const earlyAccess = useEarlyAccess();

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} className="rounded-[2.5rem] border border-accent/20 bg-[linear-gradient(135deg,rgba(126,200,255,0.08),rgba(255,255,255,0.03))] p-8 sm:p-10 lg:p-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Early access</p>
          <h2 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">Help us build the future of online coaching.</h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            We&apos;re building CoachOS with coaches, not just for coaches. Join the early access list and help shape the tools you actually need to run your coaching business.
          </p>
          <button
            type="button"
            onClick={earlyAccess.open}
            className="mt-8 inline-flex w-full justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
          >
            Join Early Access
          </button>
          <p className="mt-4 text-sm text-muted">No spam. Just early access updates and occasional product research.</p>
        </div>
      </motion.div>
    </section>
  );
}

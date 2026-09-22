"use client";

import { motion } from 'framer-motion';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

export function ClosingCta() {
  const earlyAccess = useEarlyAccess();

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} className="rounded-[2rem] border border-white/10 bg-[#0b0f14] p-8 text-center sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Built for serious coaches</p>
        <h2 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">Spend less time managing your tools. More time coaching your clients.</h2>
        <button
          type="button"
          onClick={earlyAccess.open}
          className="mt-8 inline-flex w-full justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
        >
          Join Early Access
        </button>
      </motion.div>
    </section>
  );
}

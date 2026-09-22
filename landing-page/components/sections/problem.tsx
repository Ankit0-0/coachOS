"use client";

import { motion } from 'framer-motion';

const todayTools = ['WhatsApp', 'Google Sheets', 'PDF Diet Plans', 'Workout Notes', 'Progress Photos', 'Manual Check-ins'];
const futureTools = ['Clients', 'Workout Plans', 'Diet Plans', 'Progress', 'Check-ins', 'All in one place'];

export function ProblemSection() {
  return (
    <section id="product" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">The problem</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-cream sm:text-4xl">
            Your coaching shouldn&apos;t be scattered across six different apps.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Every new client means another chat, another spreadsheet, another PDF, and another place to keep track of progress.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} className="rounded-[2rem] border border-white/10 bg-panel/60 p-6 shadow-glow">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#090c12] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Today</p>
              <div className="mt-5 space-y-3">
                {todayTools.map((tool) => (
                  <div key={tool} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-cream">
                    {tool}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">With CoachOS</p>
              <div className="mt-5 space-y-3">
                {futureTools.map((tool) => (
                  <div key={tool} className="rounded-xl border border-accent/20 bg-[#11171d] px-3 py-3 text-sm text-cream">
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-lg text-muted">
            Every client is another tab, another chat, another spreadsheet.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

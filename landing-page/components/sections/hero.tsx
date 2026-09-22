  "use client";

  import { motion } from 'framer-motion';

import { useEarlyAccess } from '@/components/early-access/early-access-provider';

  const stats = [
    { value: '24', label: 'Active clients' },
    { value: '5', label: 'Check-ins due' },
    { value: '3', label: 'Programs updated' }
  ];

  export function Hero() {
    const earlyAccess = useEarlyAccess();

    return (
      <section id="top" className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl text-center sm:text-left">
          <div className="mb-6 inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            Built for online fitness coaches
          </div>
          <h1 className="text-4xl font-semibold leading-[0.95] text-cream sm:text-5xl lg:text-7xl">
            Your coaching business. Finally, in one place.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Stop managing clients across WhatsApp, spreadsheets, PDFs, and five different apps. CoachOS brings your coaching workflow into one simple platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={earlyAccess.open}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
            >
              Join Early Access
            </button>
            <a href="#how-it-works" className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-cream transition hover:border-accent/40 hover:bg-white/5 sm:w-auto">
              See How It Works
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.55 }} className="relative">
          <div className="absolute inset-0 -translate-y-4 rounded-[2rem] bg-accent/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-panel/70 p-4 shadow-glow backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0f14] p-4 sm:p-6">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-muted">CoachOS dashboard preview</p>
                  <h2 className="mt-1 text-xl font-semibold text-cream">Good morning, Ankit</h2>
                </div>
                <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent">Pre-launch</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat, index) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.07 }} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-2xl font-semibold text-cream">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Clients</h3>
                    <span className="text-sm text-accent">+3 this week</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      ['Rahul Sharma', '82 kg', 'Fat Loss'],
                      ['Aman Verma', '74 kg', 'Muscle Gain'],
                      ['Priya Singh', '61 kg', 'Transformation']
                    ].map(([name, weight, goal]) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0a0d12] px-3 py-3">
                        <div>
                          <p className="font-medium text-cream">{name}</p>
                          <p className="text-sm text-muted">{weight} • {goal}</p>
                        </div>
                        <div className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">Active</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Workout templates</h3>
                    <div className="mt-3 space-y-2">
                      {['Push / Pull / Legs', 'Upper / Lower', 'Beginner Full Body'].map((item) => (
                        <div key={item} className="rounded-xl border border-white/10 bg-[#0a0d12] px-3 py-3 text-sm text-cream">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                    <p className="text-sm font-medium text-accent">Recent check-ins</p>
                    <p className="mt-2 text-sm text-cream">3 clients uploaded progress photos today.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    );
  }

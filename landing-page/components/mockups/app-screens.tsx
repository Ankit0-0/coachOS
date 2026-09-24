import type { ReactNode } from 'react';

import { Initials, PhoneFrame, ScreenBody, TabBar } from '@/components/mockups/phone';

/*
  The CoachOS screens, redrawn from the real apps (mobile/coaches and
  mobile/clients): same layout, same wording, the app's dark theme. The people
  and numbers are made up.
*/

type ScreenProps = { className?: string };

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[0.8em] border border-app-line bg-app-panel ${className}`}>{children}</div>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-[0.45em] mt-[1em] text-[0.85em] font-semibold text-app-text">{children}</p>;
}

function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-[0.45em] border px-[0.6em] py-[0.25em] text-[0.72em] ${
        active ? 'border-app-accent/60 bg-app-accent-soft text-app-accent' : 'border-app-line text-app-muted'
      }`}
    >
      {children}
    </span>
  );
}

function Progress({ percent, color = 'bg-app-accent' }: { percent: number; color?: string }) {
  return (
    <div className="h-[0.35em] overflow-hidden rounded-full bg-app-line">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function Chevron({ direction = 'right' }: { direction?: 'right' | 'left' }) {
  return (
    <svg viewBox="0 0 8 14" className="h-[0.75em] w-auto text-app-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'right' ? 'M1.5 1.5L6.5 7l-5 5.5' : 'M6.5 1.5L1.5 7l5 5.5'} />
    </svg>
  );
}

/** Coach app → Clients tab: requests, the roster, and the invite form. */
export function CoachClientsScreen({ className }: ScreenProps) {
  const roster = [
    { name: 'Priya Sharma', line: 'priya.s@example.com', tone: 'warm' as const },
    { name: 'Rahul Verma', line: 'rahul.v@example.com', tone: 'plain' as const },
    { name: 'Arjun Mehta', line: 'arjun.m@example.com', tone: 'accent' as const },
  ];
  return (
    <PhoneFrame
      className={className}
      label="CoachOS coach app, Clients screen: one new request from Explore, a roster of three clients, and a form to invite a client by email with a subscription length."
    >
      <ScreenBody>
        <p className="mt-[0.5em] font-display text-[2em] font-bold leading-tight">Clients</p>
        <p className="mt-[0.3em] text-[0.82em] text-app-muted">
          Everyone you coach, and anyone you&apos;ve invited who hasn&apos;t replied yet.
        </p>

        <SectionLabel>Requests (1)</SectionLabel>
        <Card className="flex items-center gap-[0.7em] p-[0.75em]">
          <Initials name="Neha Kapoor" tone="accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9em] font-semibold">Neha Kapoor</p>
            <p className="truncate text-[0.72em] text-app-muted">Found you in Explore</p>
          </div>
          <span className="rounded-[0.5em] bg-app-accent px-[0.7em] py-[0.35em] text-[0.72em] font-semibold text-app-ink">Accept</span>
        </Card>

        <SectionLabel>Roster (3)</SectionLabel>
        <Card className="divide-y divide-app-line">
          {roster.map((client) => (
            <div key={client.name} className="flex items-center gap-[0.7em] px-[0.75em] py-[0.65em]">
              <Initials name={client.name} tone={client.tone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9em] font-semibold">{client.name}</p>
                <p className="truncate text-[0.72em] text-app-muted">{client.line}</p>
              </div>
              <Chevron />
            </div>
          ))}
        </Card>

        <SectionLabel>Invite a client</SectionLabel>
        <Card className="p-[0.75em]">
          <div className="flex gap-[0.5em]">
            <span className="flex-1 truncate rounded-[0.5em] border border-app-line bg-app-sunken px-[0.6em] py-[0.45em] text-[0.8em] text-app-muted">
              client@example.com
            </span>
            <span className="rounded-[0.5em] bg-app-accent px-[0.9em] py-[0.45em] text-[0.8em] font-semibold text-app-ink">Send</span>
          </div>
          <p className="mt-[0.6em] text-[0.72em] text-app-muted">Subscription length</p>
          <div className="mt-[0.35em] flex flex-wrap gap-[0.35em]">
            <Chip>1 month</Chip>
            <Chip active>3 months</Chip>
            <Chip>6 months</Chip>
            <Chip>No fixed period</Chip>
          </div>
        </Card>
      </ScreenBody>
      <TabBar app="coach" active="Clients" />
    </PhoneFrame>
  );
}

/** Coach app → one client: current plans, weight trend, check-in calendar, subscription. */
export function CoachClientDetailScreen({ className }: ScreenProps) {
  // Six weeks of weigh-ins: a gentle, uneven trend — nothing dramatic.
  const weights = [67.3, 67.4, 67.0, 67.1, 66.8, 66.9, 66.5, 66.6, 66.3, 66.1];
  const min = 65.8;
  const max = 67.6;
  const points = weights
    .map((kg, index) => `${(index / (weights.length - 1)) * 100},${((max - kg) / (max - min)) * 40}`)
    .join(' ');
  // One month of check-ins: w = workout ticked, d = diet ticked, b = both, . = nothing.
  const month = 'bbdb.wbbbd.b.bbwbb.dbbbb.bw';
  const dayClass: Record<string, string> = {
    b: 'bg-app-accent',
    w: 'bg-app-accent/45',
    d: 'bg-app-diet/60',
    '.': 'bg-app-line',
  };

  return (
    <PhoneFrame
      className={className}
      label="CoachOS coach app, a client's page: her current workout and diet plans, a weight trend over six weeks, a calendar of this month's check-ins, and her subscription period."
    >
      <ScreenBody>
        <div className="mt-[0.3em] flex items-center gap-[0.6em]">
          <Chevron direction="left" />
          <Initials name="Priya Sharma" tone="warm" size={2.6} />
          <div className="min-w-0">
            <p className="truncate text-[1.15em] font-bold">Priya Sharma</p>
            <p className="text-[0.72em] text-app-muted">Goal: fat loss, stronger lifts</p>
          </div>
        </div>

        <SectionLabel>Current plans</SectionLabel>
        <Card className="divide-y divide-app-line">
          {[
            { kind: 'Workout', title: 'Push / pull / legs', meta: 'Day 3 of 7' },
            { kind: 'Diet', title: 'Home-style veg, 1,800 kcal', meta: 'Day 3 of 7' },
          ].map((plan) => (
            <div key={plan.kind} className="flex items-center justify-between gap-[0.5em] px-[0.75em] py-[0.6em]">
              <div className="min-w-0">
                <p className={`text-[0.68em] font-semibold ${plan.kind === 'Diet' ? 'text-app-diet' : 'text-app-accent'}`}>{plan.kind}</p>
                <p className="truncate text-[0.85em] font-semibold">{plan.title}</p>
              </div>
              <span className="shrink-0 text-[0.7em] text-app-muted">{plan.meta}</span>
            </div>
          ))}
        </Card>

        <SectionLabel>Progress</SectionLabel>
        <Card className="p-[0.75em]">
          <div className="flex items-baseline justify-between">
            <p className="text-[0.8em] font-semibold">Weight trend</p>
            <p className="text-[0.7em] text-app-muted">6 weeks</p>
          </div>
          <p className="mt-[0.2em] text-[1.3em] font-bold">
            66.1 <span className="text-[0.6em] font-medium text-app-muted">kg</span>
          </p>
          <svg viewBox="-2 -4 104 50" className="mt-[0.3em] h-auto w-full" preserveAspectRatio="none">
            {[0, 20, 40].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#1c232d" strokeWidth="0.6" />
            ))}
            <polyline points={points} fill="none" stroke="#7ec8ff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            {weights.map((kg, index) => (
              <circle
                key={index}
                cx={(index / (weights.length - 1)) * 100}
                cy={((max - kg) / (max - min)) * 40}
                r="1.4"
                fill="#05070a"
                stroke="#7ec8ff"
                strokeWidth="1"
              />
            ))}
          </svg>

          <div className="mt-[0.7em] flex items-center justify-between text-[0.7em] text-app-muted">
            <span>This month</span>
            <span className="flex items-center gap-[0.8em]">
              <span className="flex items-center gap-[0.3em]">
                <i className="inline-block h-[0.6em] w-[0.6em] rounded-full bg-app-accent" />
                Workout
              </span>
              <span className="flex items-center gap-[0.3em]">
                <i className="inline-block h-[0.6em] w-[0.6em] rounded-full bg-app-diet/60" />
                Diet
              </span>
            </span>
          </div>
          <div className="mt-[0.4em] grid grid-cols-7 gap-[0.3em]">
            {month.split('').map((day, index) => (
              <span key={index} className={`aspect-square rounded-[0.3em] ${dayClass[day]}`} />
            ))}
          </div>
        </Card>

        <SectionLabel>Subscription</SectionLabel>
        <Card className="flex items-center justify-between p-[0.75em]">
          <div>
            <p className="text-[0.85em] font-semibold">3 months</p>
            <p className="text-[0.72em] text-app-muted">12 Sep – 11 Dec</p>
          </div>
          <span className="rounded-full bg-[#15261b] px-[0.6em] py-[0.2em] text-[0.7em] font-semibold text-app-success">Active</span>
        </Card>
      </ScreenBody>
    </PhoneFrame>
  );
}

function PlanCard({
  kind,
  day,
  title,
  chips,
  percent,
  progress,
}: {
  kind: 'Workout' | 'Diet';
  day: string;
  title: string;
  chips: string[];
  percent: number;
  progress: string;
}) {
  const isDiet = kind === 'Diet';
  return (
    <Card className="p-[0.85em]">
      <div className="flex items-center gap-[0.5em]">
        <span
          className={`flex h-[1.9em] w-[1.9em] items-center justify-center rounded-[0.5em] ${
            isDiet ? 'bg-[#11261d] text-app-diet' : 'bg-app-accent-soft text-app-accent'
          }`}
        >
          {isDiet ? (
            <svg viewBox="0 0 24 24" className="h-[1em] w-[1em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5h3.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[1em] w-[1em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" />
            </svg>
          )}
        </span>
        <p className="text-[0.72em] font-semibold text-app-muted">
          {kind} · {day}
        </p>
      </div>
      <p className="mt-[0.45em] text-[1.1em] font-bold">{title}</p>
      <div className="mt-[0.4em] flex flex-wrap gap-[0.35em]">
        {chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <div className="mt-[0.7em]">
        <Progress percent={percent} color={isDiet ? 'bg-app-diet' : 'bg-app-accent'} />
      </div>
      <p className="mt-[0.35em] text-[0.7em] text-app-muted">{progress}</p>
    </Card>
  );
}

/** Client app → Home: what the coach has lined up today, and today's weigh-in. */
export function ClientTodayScreen({ className }: ScreenProps) {
  return (
    <PhoneFrame
      className={className}
      label="CoachOS client app, Home screen: today's workout, Push day, with 6 of 16 sets done, today's diet with 2 of 4 meals done, and a card to log today's weight and physique photo."
    >
      <div className="flex items-center gap-[0.55em] border-b border-app-line px-[1.1em] py-[0.5em]">
        <Initials name="Aman Kapoor" tone="accent" size={2} />
        <p className="text-[0.75em] text-app-muted">
          Your coach · <span className="font-semibold text-app-text">Aman Kapoor</span>
        </p>
      </div>
      <ScreenBody>
        <p className="mt-[0.5em] text-[0.75em] font-semibold text-app-accent">Coach OS</p>
        <p className="font-display text-[1.75em] font-bold leading-tight">Ready for today?</p>
        <p className="mt-[0.2em] text-[0.8em] text-app-muted">Here is what your coach has lined up for today.</p>

        <p className="mb-[0.45em] mt-[0.9em] text-[0.78em] font-semibold text-app-muted">Today</p>
        <div className="flex flex-col gap-[0.6em]">
          <PlanCard
            kind="Workout"
            day="Day 3 of 7"
            title="Push day"
            chips={['45 min', '5 exercises', '16 sets']}
            percent={37.5}
            progress="6 of 16 sets done today"
          />
          <PlanCard
            kind="Diet"
            day="Day 3 of 7"
            title="Home-style veg"
            chips={['1,800 kcal', '4 meals']}
            percent={50}
            progress="2 of 4 meals done today"
          />
          <Card className="p-[0.85em]">
            <p className="text-[0.85em] font-semibold">Today&apos;s update</p>
            <div className="mt-[0.5em] flex items-center justify-between text-[0.78em]">
              <span className="text-app-muted">Physique update</span>
              <span className="rounded-[0.4em] border border-app-line px-[0.7em] py-[0.3em]">Upload</span>
            </div>
            <div className="mt-[0.45em] flex items-center justify-between text-[0.78em]">
              <span className="text-app-muted">Weight update</span>
              <span className="w-[5em] rounded-[0.5em] border border-app-line bg-app-sunken px-[0.6em] py-[0.3em] text-right">66.1</span>
            </div>
          </Card>
        </div>
      </ScreenBody>
      <TabBar app="client" active="Home" />
    </PhoneFrame>
  );
}

/** Client app → today's workout: each exercise's sets to tick, with a note per set. */
export function ClientWorkoutScreen({ className }: ScreenProps) {
  const exercises = [
    { name: 'Flat bench press', note: 'Warm-up set first', sets: [['12', '90s', true], ['10', '90s', true], ['10', '90s', true], ['8', '2 min', false]] },
    { name: 'Incline dumbbell press', note: 'Slow on the way down', sets: [['12', '60s', true], ['12', '60s', false], ['12', '60s', false]] },
  ] as const;

  return (
    <PhoneFrame
      className={className}
      label="CoachOS client app, today's workout: Flat bench press with 3 of 4 sets ticked off and Incline dumbbell press with 1 of 3, each set showing reps and rest, with space for a note to the coach."
    >
      <ScreenBody>
        <div className="mt-[0.3em] flex items-center gap-[0.5em]">
          <Chevron direction="left" />
          <span className="text-[0.75em] text-app-muted">Home</span>
        </div>
        <p className="mt-[0.6em] text-[0.72em] font-semibold text-app-accent">Workout · Day 3 of 7</p>
        <p className="font-display text-[1.75em] font-bold leading-tight">Push day</p>
        <p className="mt-[0.2em] text-[0.78em] text-app-muted">Tick each set as you go. Tap a set to leave your coach a note.</p>

        <div className="mt-[0.8em] flex flex-col gap-[0.6em]">
          {exercises.map((exercise) => {
            const done = exercise.sets.filter((set) => set[2]).length;
            return (
              <Card key={exercise.name} className="p-[0.8em]">
                <div className="flex items-start justify-between gap-[0.5em]">
                  <div className="min-w-0">
                    <p className="text-[0.7em] font-semibold text-app-accent">{exercise.sets.length} sets</p>
                    <p className="text-[1em] font-semibold">{exercise.name}</p>
                    <p className="text-[0.72em] text-app-muted">{exercise.note}</p>
                  </div>
                  <span className="text-[0.75em] font-semibold text-app-muted">
                    {done}/{exercise.sets.length}
                  </span>
                </div>
                <div className="mt-[0.55em] flex border-b border-app-line pb-[0.3em] pl-[2.4em] text-[0.68em] font-semibold text-app-muted">
                  <span className="w-[3em]">Set</span>
                  <span className="flex-1">Reps</span>
                  <span className="flex-1">Rest</span>
                </div>
                <div className="mt-[0.4em] flex flex-col gap-[0.3em]">
                  {exercise.sets.map(([reps, rest, isDone], index) => (
                    <div key={index} className="flex items-center rounded-[0.5em] border border-app-line py-[0.35em] pl-[0.5em] text-[0.78em]">
                      <span
                        className={`flex h-[1.3em] w-[1.3em] items-center justify-center rounded-full border-[1.5px] ${
                          isDone ? 'border-app-accent bg-app-accent text-app-ink' : 'border-app-muted'
                        }`}
                      >
                        {isDone ? (
                          <svg viewBox="0 0 12 12" className="h-[0.75em] w-[0.75em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 6.2l2.2 2.2 4.8-5" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="ml-[0.9em] w-[2.9em] font-semibold">{index + 1}</span>
                      <span className="flex-1">{reps}</span>
                      <span className="flex-1">{rest}</span>
                      <svg viewBox="0 0 24 24" className="mr-[0.6em] h-[1.1em] w-[1.1em] text-app-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                        <path d="M4 5h16v11H9l-5 4z" />
                      </svg>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </ScreenBody>
    </PhoneFrame>
  );
}

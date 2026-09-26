import type { ReactNode } from 'react';

import { Initials, PhoneFrame, ScreenBody, TabBar } from '@/components/mockups/phone';

/*
  The CoachOS screens, redrawn from the real apps (mobile/coaches and
  mobile/clients, reference captures in docs/theme-screens/*\/light): same
  layout, same wording, the apps' light theme. The people and numbers are
  made up.
*/

type ScreenProps = { className?: string };

/** An outer card: `surface` on the page, radius xl, the apps' card shadow. */
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.5em] border border-app-border bg-app-surface shadow-[0_0.06em_0.15em_rgba(24,59,50,0.06),0_0.5em_1.5em_-0.8em_rgba(24,59,50,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

/** The cream tray inside a card that holds rows. */
function Inset({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.25em] bg-app-inset p-[0.6em] ${className}`}>{children}</div>;
}

/** A white row inside an inset tray. */
function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[0.9em] border border-app-border bg-app-surface ${className}`}>{children}</div>;
}

function ScreenTitle({ children }: { children: ReactNode }) {
  return <p className="mt-[0.5em] font-display text-[1.8em] font-bold leading-tight tracking-tight text-app-heading">{children}</p>;
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-[0.55em] mt-[1.2em] flex items-center justify-between">
      <p className="font-display text-[1.2em] font-bold text-app-heading">{children}</p>
      {aside}
    </div>
  );
}

type ChipTone = 'green' | 'warm' | 'neutral';

function Chip({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  const tones: Record<ChipTone, string> = {
    green: 'bg-app-chip text-app-chip-text',
    warm: 'bg-app-warm text-app-warm-text',
    neutral: 'bg-app-neutral text-app-neutral-text',
  };
  return (
    <span className={`whitespace-nowrap rounded-full px-[0.75em] py-[0.3em] text-[0.78em] font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

function Button({ children, variant = 'primary', className = '' }: { children: ReactNode; variant?: 'primary' | 'outline'; className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-[0.9em] px-[1em] py-[0.6em] text-[0.9em] font-semibold ${
        variant === 'primary' ? 'bg-app-primary text-app-on-primary' : 'border border-app-border bg-app-surface text-app-text'
      } ${className}`}
    >
      {children}
    </span>
  );
}

function Progress({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-[0.4em] overflow-hidden rounded-full bg-app-chart-empty">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function Chevron({ direction = 'right', className = 'text-app-muted' }: { direction?: 'right' | 'left'; className?: string }) {
  return (
    <svg viewBox="0 0 8 14" className={`h-[0.7em] w-auto shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'right' ? 'M1.5 1.5L6.5 7l-5 5.5' : 'M6.5 1.5L1.5 7l5 5.5'} />
    </svg>
  );
}

/** The round back button and title of a pushed screen (DetailHeader in the apps). */
function DetailHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-[0.4em] flex items-center gap-[0.8em]">
      <span className="flex h-[2.7em] w-[2.7em] shrink-0 items-center justify-center rounded-full border border-app-border bg-app-surface">
        <Chevron direction="left" className="text-app-text" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-[1.6em] font-bold leading-tight tracking-tight text-app-heading">{title}</p>
        <p className="truncate text-[0.88em] text-app-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

/** Coach app → Clients tab: a request, the roster, and the invite form. */
export function CoachClientsScreen({ className }: ScreenProps) {
  const roster = [
    { name: 'Arjun Mehta', email: 'arjun.mehta@example.com' },
    { name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    { name: 'Rahul Verma', email: 'rahul.verma@example.com' },
  ];
  return (
    <PhoneFrame
      className={className}
      label="CoachOS coach app, Clients screen: a request from Neha Kapoor with her message and Accept or Decline, a roster of three clients, and a form to invite a client by email with a subscription length."
    >
      <ScreenBody>
        <ScreenTitle>Clients</ScreenTitle>
        <p className="mt-[0.25em] text-[0.88em] leading-snug text-app-secondary">
          Everyone you coach, and anyone you&apos;ve invited who hasn&apos;t replied yet.
        </p>

        <SectionTitle
          aside={
            <span className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full bg-app-badge text-[0.75em] font-bold text-white">1</span>
          }
        >
          Requests
        </SectionTitle>
        <Card className="p-[1.1em]">
          <div className="flex items-center gap-[0.75em]">
            <Initials name="Neha Kapoor" size={2.9} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95em] font-semibold text-app-text">Neha Kapoor</p>
              <p className="truncate text-[0.82em] text-app-secondary">neha.kapoor@example.com</p>
            </div>
            <span className="shrink-0 text-[0.8em] text-app-secondary">Sep 25</span>
          </div>
          <p className="mt-[0.8em] rounded-[0.9em] bg-app-inset px-[0.85em] py-[0.65em] text-[0.85em] leading-snug text-app-text">
            Training for my first half marathon in March. Can do 4 sessions a week.
          </p>
          <div className="mt-[0.8em] grid grid-cols-2 gap-[0.5em]">
            <Button variant="outline">Decline</Button>
            <Button>Accept</Button>
          </div>
        </Card>

        <SectionTitle
          aside={<span className="rounded-full bg-app-warm px-[0.65em] py-[0.15em] text-[0.75em] font-semibold text-app-warm-text">3</span>}
        >
          Roster
        </SectionTitle>
        <Card className="p-[0.6em]">
          <Inset className="flex flex-col gap-[0.45em]">
            {roster.map((client) => (
              <Row key={client.name} className="flex items-center gap-[0.7em] px-[0.8em] py-[0.6em]">
                <Initials name={client.name} size={2.6} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9em] font-semibold text-app-text">{client.name}</p>
                  <p className="truncate text-[0.8em] text-app-secondary">{client.email}</p>
                </div>
                <Chevron />
              </Row>
            ))}
          </Inset>
        </Card>

        <SectionTitle>Invite a client</SectionTitle>
        <Card className="p-[1.1em]">
          <div className="flex gap-[0.5em]">
            <span className="min-w-0 flex-1 truncate rounded-[0.9em] border border-app-border-input px-[0.8em] py-[0.6em] text-[0.88em] text-app-muted">
              client@example.com
            </span>
            <Button>Send</Button>
          </div>
          <p className="mt-[0.8em] text-[0.8em] text-app-secondary">Subscription length</p>
          <div className="mt-[0.4em] grid grid-cols-5 rounded-[0.9em] border border-app-border bg-app-inset p-[0.25em] text-center text-[0.8em]">
            {['1 mo', '3 mo', '6 mo', '12 mo', 'Ongoing'].map((option) => (
              <span
                key={option}
                className={`rounded-[0.7em] py-[0.45em] ${option === '3 mo' ? 'bg-app-primary font-semibold text-app-on-primary' : 'text-app-text'}`}
              >
                {option}
              </span>
            ))}
          </div>
        </Card>
      </ScreenBody>
      <TabBar app="coach" active="Clients" />
    </PhoneFrame>
  );
}

/**
 * Coach app → one client, scrolled to Progress: the weight trend and the
 * month's check-in calendar. The screen's top half (profile, current plans)
 * is above the fold here, as it would be on the phone.
 */
export function CoachClientDetailScreen({ className }: ScreenProps) {
  // Six weeks of weigh-ins: a gentle, uneven trend — nothing dramatic.
  const weights = [67.4, 67.5, 67.1, 67.2, 66.8, 66.9, 66.5, 66.6, 66.3, 66.1];
  // The apps' padded axis (packages/theme weightAxis) for these values.
  const ticks = [69, 68, 67, 66, 65];
  const [top, bottom] = [ticks[0], ticks[ticks.length - 1]];
  const y = (kg: number) => ((top - kg) / (top - bottom)) * 60;
  const x = (index: number) => 12 + (index / (weights.length - 1)) * 86;
  const points = weights.map((kg, index) => `${x(index)},${y(kg)}`).join(' ');

  // September, Sunday first: [workout, diet] completion per day, null for a rest day.
  const month: ([number, number] | null)[] = [
    [1, 1], [0.6, 1], [1, 0.5], null, [1, 1], [1, 0.75], [0.8, 1],
    [1, 1], null, [1, 1], [1, 0.5], [1, 1], [0.5, 0.75], null,
    [1, 1], [1, 1], [0.7, 1], [1, 0.5], null, [1, 1], [1, 1],
    [1, 0.75], [1, 1], [0.4, 0.5], [0, 0], [0, 0], [0, 0], null,
    [0, 0], [0, 0],
  ];
  const firstWeekday = 2; // 1 September 2026 is a Tuesday.

  return (
    <PhoneFrame
      className={className}
      label="CoachOS coach app, one client's page scrolled to Progress: her weight trend over the past month, down from 67.4 to 66.1 kg, and a calendar of September showing which days she logged her workout and her diet."
    >
      <ScreenBody>
        <SectionTitle>Progress</SectionTitle>
        <Card className="p-[1.1em]">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[1.1em] font-bold text-app-heading">Weight trend</p>
            <p className="font-display text-[1.5em] font-bold text-app-text">
              66.1<span className="ml-[0.1em] text-[0.55em] font-medium text-app-muted">kg</span>
            </p>
          </div>
          <div className="mt-[0.6em] grid grid-cols-4 rounded-[0.9em] border border-app-border bg-app-inset p-[0.25em] text-center text-[0.78em]">
            {['1 week', '1 month', '3 months', '1 year'].map((range) => (
              <span
                key={range}
                className={`rounded-[0.7em] py-[0.45em] ${range === '1 month' ? 'bg-app-primary font-semibold text-app-on-primary' : 'text-app-text'}`}
              >
                {range}
              </span>
            ))}
          </div>
          <svg viewBox="0 -6 100 76" className="mt-[0.5em] h-auto w-full">
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1="12" x2="100" y1={y(tick)} y2={y(tick)} stroke="rgba(24, 59, 50, 0.10)" strokeWidth="0.5" />
                <text x="8" y={y(tick) + 1.6} textAnchor="end" fontSize="3.6" fill="#5E6963">
                  {tick}
                </text>
              </g>
            ))}
            <polyline points={points} fill="none" stroke="#46625B" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
            {weights.map((kg, index) => (
              <circle key={index} cx={x(index)} cy={y(kg)} r="1.5" fill="#46625B" />
            ))}
            {[
              ['26 Aug', 12],
              ['9 Sep', 55],
              ['23 Sep', 98],
            ].map(([label, at]) => (
              <text key={label} x={at} y="69" textAnchor={at === 98 ? 'end' : at === 12 ? 'start' : 'middle'} fontSize="3.6" fill="#5E6963">
                {label}
              </text>
            ))}
          </svg>
        </Card>

        <Card className="mt-[0.8em] p-[1.1em]">
          <div className="flex items-center justify-between">
            <span className="flex h-[2.4em] w-[2.4em] items-center justify-center rounded-full border border-app-border">
              <Chevron direction="left" className="text-app-text" />
            </span>
            <p className="font-display text-[1.1em] font-bold text-app-heading">September 2026</p>
            <span className="flex h-[2.4em] w-[2.4em] items-center justify-center rounded-full border border-app-border opacity-40">
              <Chevron />
            </span>
          </div>
          <p className="mt-[0.6em] text-[0.8em] text-app-secondary">19 of 25 training days logged</p>
          <div className="mt-[0.3em] flex justify-end gap-[0.9em] text-[0.75em] text-app-secondary">
            <span className="flex items-center gap-[0.35em]">
              <i className="inline-block h-[0.6em] w-[0.6em] rounded-full bg-app-chart-bar" />
              Workout
            </span>
            <span className="flex items-center gap-[0.35em]">
              <i className="inline-block h-[0.6em] w-[0.6em] rounded-full bg-app-chart-diet" />
              Diet
            </span>
          </div>
          <div className="mt-[0.5em] grid grid-cols-7 gap-y-[0.35em] text-center text-[0.72em] text-app-secondary">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
              <span key={index}>{weekday}</span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {month.map((day, index) => (
              <span key={index} className="flex flex-col items-center gap-[0.1em]">
                <DayRings day={day} />
                <span className="text-app-text">{index + 1}</span>
              </span>
            ))}
          </div>
        </Card>
      </ScreenBody>
      <TabBar app="coach" active="Clients" />
    </PhoneFrame>
  );
}

/** One calendar day, as MonthlyActivityCalendar draws it: workout ring outside, diet inside. */
function DayRings({ day }: { day: [number, number] | null }) {
  if (!day) {
    return (
      <span className="flex h-[1.9em] w-[1.9em] items-center justify-center">
        <span className="h-[0.15em] w-[0.9em] rounded-full bg-app-chart-empty" />
      </span>
    );
  }
  const ring = (r: number, share: number, color: string) => {
    const circumference = 2 * Math.PI * r;
    return (
      <>
        <circle cx="14" cy="14" r={r} fill="none" stroke="#E8EBEA" strokeWidth="2" />
        {share > 0 ? (
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${circumference * share} ${circumference}`}
            transform="rotate(-90 14 14)"
          />
        ) : null}
      </>
    );
  };
  return (
    <svg viewBox="0 0 28 28" className="h-[1.9em] w-[1.9em]">
      {ring(9, day[0], '#46625B')}
      {ring(6, day[1], '#C96F4A')}
    </svg>
  );
}

function PlanCard({
  kind,
  day,
  title,
  body,
  chips,
  done,
  percent,
}: {
  kind: 'Workout' | 'Diet';
  day: string;
  title: string;
  body: string;
  chips: string[];
  done: string;
  percent: number;
}) {
  const isDiet = kind === 'Diet';
  return (
    <Card className="p-[1.1em]">
      <div className="flex items-center gap-[0.6em]">
        <span
          className={`flex h-[2.6em] w-[2.6em] shrink-0 items-center justify-center rounded-[0.8em] ${
            isDiet ? 'bg-app-warm text-app-warm-text' : 'bg-app-chip text-app-chip-text'
          }`}
        >
          {isDiet ? (
            <svg viewBox="0 0 24 24" className="h-[1.2em] w-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5h3.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[1.2em] w-[1.2em] -rotate-45" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" />
            </svg>
          )}
        </span>
        {/* The icon tile already says workout or diet; the pill only names the day. */}
        <Chip tone={isDiet ? 'warm' : 'green'} className="min-w-0 truncate">
          {day}
        </Chip>
        <span className="ml-auto">
          <Chevron />
        </span>
      </div>
      <p className="mt-[0.7em] font-display text-[1.1em] font-bold text-app-heading">{title}</p>
      <p className="mt-[0.15em] text-[0.85em] leading-snug text-app-secondary">{body}</p>
      <div className="mt-[0.6em] flex flex-wrap gap-[0.35em]">
        {chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <div className="mb-[0.35em] mt-[0.75em] flex justify-between text-[0.8em] text-app-secondary">
        <span>{done}</span>
        <span>{percent}%</span>
      </div>
      <Progress percent={percent} color={isDiet ? 'bg-app-chart-diet' : 'bg-app-chart-bar'} />
    </Card>
  );
}

/** Client app → Home: the coach, what they've lined up today, and today's update. */
export function ClientTodayScreen({ className }: ScreenProps) {
  return (
    <PhoneFrame
      className={className}
      label="CoachOS client app, Home screen: her coach Aman Kapoor at the top, then today's workout, Push, with 6 of 16 sets done, and today's diet with 2 of 4 meals done."
    >
      <ScreenBody>
        <Card className="mt-[0.3em] flex items-center gap-[0.7em] px-[0.9em] py-[0.7em]">
          <Initials name="Aman Kapoor" tone="sage" size={2.6} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.78em] text-app-secondary">Your coach</p>
            <p className="truncate text-[0.92em] font-semibold text-app-text">Aman Kapoor</p>
          </div>
          <Chevron />
        </Card>

        <ScreenTitle>Ready for today?</ScreenTitle>
        <p className="mt-[0.2em] text-[0.88em] text-app-secondary">Here is what your coach has lined up for today.</p>

        <SectionTitle>Today</SectionTitle>
        <div className="flex flex-col gap-[0.75em]">
          <PlanCard
            kind="Workout"
            day="Day 3 of 7 · Push"
            title="Push / pull / legs"
            body="Three lifting days, a walk and a mobility day."
            chips={['45 min', '5 exercises', '16 sets']}
            done="6 of 16 sets done today"
            percent={38}
          />
          <PlanCard
            kind="Diet"
            day="Day 3 of 7 · Training day"
            title="Home-style veg"
            body="Simple vegetarian meals, protein at every one."
            chips={['1,800 kcal', '4 meals']}
            done="2 of 4 meals done today"
            percent={50}
          />
          <Card className="p-[1.1em]">
            <p className="font-display text-[1.1em] font-bold text-app-heading">Today&apos;s update</p>
            <p className="mt-[0.15em] text-[0.85em] text-app-secondary">Log a weigh-in or a physique photo. Your coach sees it.</p>
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
    { name: 'Flat bench press', note: 'Warm-up set first', reps: '8', rest: '120s', done: 4, sets: 4 },
    { name: 'Incline dumbbell press', note: 'Slow on the way down', reps: '12', rest: '60s', done: 2, sets: 3 },
  ];

  return (
    <PhoneFrame
      className={className}
      label="CoachOS client app, today's workout: Push, with 6 of 16 sets checked. Flat bench press has all 4 sets ticked off and Incline dumbbell press 2 of 3, each set showing reps and rest, with a button to leave the coach a comment."
    >
      <ScreenBody>
        <DetailHeader title="Workout" subtitle="Push / pull / legs" />

        <Card className="mt-[0.9em] p-[1.1em]">
          <div className="flex flex-wrap gap-[0.35em]">
            <Chip tone="green">Workout · Day 3 of 7 · Push</Chip>
            <Chip>45 min</Chip>
          </div>
          <p className="mt-[0.6em] font-display text-[1.1em] font-bold text-app-heading">Push</p>
          <p className="mb-[0.35em] mt-[0.3em] text-[0.8em] text-app-secondary">6 of 16 sets checked</p>
          <Progress percent={38} color="bg-app-chart-bar" />
          <p className="mt-[0.6em] text-[0.82em] leading-snug text-app-secondary">
            Tap a set to leave a comment or a video reference for your coach.
          </p>
        </Card>

        <div className="mt-[0.8em] flex flex-col gap-[0.8em]">
          {exercises.map((exercise) => (
            <Card key={exercise.name} className="p-[1.1em]">
              <div className="flex items-start justify-between gap-[0.5em]">
                <div className="min-w-0">
                  <p className="font-display text-[1.05em] font-bold text-app-heading">{exercise.name}</p>
                  <p className="text-[0.82em] text-app-secondary">{exercise.note}</p>
                </div>
                <Chip>
                  {exercise.done}/{exercise.sets}
                </Chip>
              </div>
              <Inset className="mt-[0.6em] flex flex-col gap-[0.4em]">
                {Array.from({ length: exercise.sets }, (_, index) => {
                  const isDone = index < exercise.done;
                  return (
                    <Row key={index} className="flex items-center gap-[0.7em] px-[0.7em] py-[0.5em]">
                      <span
                        className={`flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center rounded-full border-2 ${
                          isDone ? 'border-app-primary bg-app-primary text-app-on-primary' : 'border-app-border-strong'
                        }`}
                      >
                        {isDone ? (
                          <svg viewBox="0 0 12 12" className="h-[0.8em] w-[0.8em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 6.2l2.2 2.2 4.8-5" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[0.85em] font-semibold text-app-text">
                          Set {index + 1} · {exercise.reps} reps
                        </span>
                        <span className="block text-[0.78em] text-app-secondary">Rest {exercise.rest}</span>
                      </span>
                      <svg viewBox="0 0 24 24" className="h-[1.1em] w-[1.1em] shrink-0 text-app-secondary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16v12H9l-5 4z" />
                        <path d="M12 7.5v5M9.5 10h5" />
                      </svg>
                    </Row>
                  );
                })}
              </Inset>
            </Card>
          ))}
        </div>
      </ScreenBody>
      <TabBar app="client" active="Home" />
    </PhoneFrame>
  );
}

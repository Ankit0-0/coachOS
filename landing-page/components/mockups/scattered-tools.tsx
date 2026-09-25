import type { ReactNode } from 'react';

/*
  The tools coaching runs on today — WhatsApp, a Google Sheet, a calendar of
  reminders, a phone gallery, a PDF plan and a check-in form — drawn in HTML
  to look like screenshots of each. Every name, number and photo is made up;
  the "photos" are illustrations.
*/

type TileProps = { className?: string };

/* ---------------------------------------------------------------- WhatsApp */

function DoubleTick({ read = true }: { read?: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className="inline-block h-2.5 w-3.5" fill="none" stroke={read ? '#53BDEB' : '#8696A0'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l3 3 6-7M6.5 8.2L7.5 9l6-7" />
    </svg>
  );
}

function Bubble({
  from,
  time,
  children,
  first = false,
}: {
  from: 'them' | 'me';
  time: string;
  children: ReactNode;
  /** First in a run: square corner where the tail would be. */
  first?: boolean;
}) {
  const mine = from === 'me';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[82%] rounded-lg px-2 pb-1 pt-1.5 text-[11px] leading-snug text-[#111B21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
          mine ? 'bg-[#D9FDD3]' : 'bg-white'
        } ${first ? (mine ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}
      >
        {children}
        <span className="float-right ml-2 mt-1 flex translate-y-0.5 items-center gap-0.5 text-[9px] text-[#667781]">
          {time}
          {mine ? <DoubleTick /> : null}
        </span>
      </div>
    </div>
  );
}

export function WhatsAppTile({ className = '' }: TileProps) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl shadow-lift ring-1 ring-black/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#008069] px-2.5 py-2 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        <span className="-ml-1 text-[10px] font-semibold">32</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFE5E7] text-[11px] font-bold text-[#54656F]">P</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight">Priya (client)</span>
          <span className="block text-[9px] leading-tight text-white/80">online</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
          <path d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM17 10l4-3v10l-4-3z" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
          <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </div>

      {/* Conversation, on WhatsApp's beige doodle wallpaper */}
      <div
        className="flex flex-1 flex-col gap-1.5 bg-[#EFEAE2] px-2 py-2.5"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1.2px), radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1.2px)',
          backgroundSize: '14px 14px, 22px 22px',
          backgroundPosition: '0 0, 7px 11px',
        }}
      >
        <span className="mx-auto mb-1 rounded-md bg-white px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#54656F] shadow-sm">Today</span>

        <Bubble from="them" time="7:02 am" first>
          Good morning sir 🙏 which workout is today?
        </Bubble>
        <Bubble from="them" time="8:15 am">
          <span className="-mx-1 -mt-0.5 mb-1 block w-[140px] max-w-full overflow-hidden rounded-md">
            <FoodThali />
          </span>
          breakfast ✅
        </Bubble>
        <Bubble from="me" time="9:40 am" first>
          Check the PDF I sent on Monday
        </Bubble>
        <Bubble from="them" time="9:41 am" first>
          Which one? There are 3 😅
        </Bubble>
        <Bubble from="me" time="9:43 am" first>
          <span className="-mx-1 mb-1 flex items-center gap-2 rounded-md bg-[#CFF5C8] px-2 py-1.5">
            <span className="flex h-7 w-6 shrink-0 items-center justify-center rounded-sm bg-[#E53935] text-[7px] font-bold text-white">PDF</span>
            <span className="min-w-0">
              <span className="block truncate text-[10.5px] font-medium">workout_plan_v3_FINAL.pdf</span>
              <span className="block text-[9px] text-[#667781]">2 pages · 148 kB</span>
            </span>
          </span>
        </Bubble>
        <Bubble from="them" time="9:45 am" first>
          Ok. Also can I swap paneer for tofu at dinner?
        </Bubble>
        <Bubble from="them" time="9:45 am">
          And my weight today is 66.4
        </Bubble>
      </div>

      {/* Composer */}
      <div className="flex items-center gap-1.5 bg-[#F0F2F5] px-2 py-1.5">
        <span className="flex flex-1 items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[10.5px] text-[#8696A0]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5a4.5 4.5 0 007 0M9 10h.01M15 10h.01" strokeLinecap="round" />
          </svg>
          Message
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-2.1A7 7 0 0019 12z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Google Sheet */

const sheetRows: [string, string, string, string, string, 'PAID' | 'PENDING' | 'PARTIAL' | ''][] = [
  ['Priya S', '98xxxxx21', '01/09/26', '3 month', '4500', 'PAID'],
  ['Rahul V', '97xxxxx07', '15/08/26', '1 month', '2000', 'PENDING'],
  ['Neha K', '99xxxxx55', '05/09/26', '3 month', '4500', 'PARTIAL'],
  ['Arjun M', '98xxxxx13', '20/07/26', '6 month', '8000', 'PAID'],
  ['Kabir S', '90xxxxx88', '10/09/26', '1 month', '2000', 'PENDING'],
  ['Sneha R', '96xxxxx34', '12/09/26', '3 month', '4500', 'PAID'],
];

/** Google Sheets' default conditional-format fills. */
const paymentFill = {
  PAID: 'bg-[#B7E1CD]',
  PENDING: 'bg-[#F4C7C3] font-bold',
  PARTIAL: 'bg-[#FCE8B2]',
  '': '',
} as const;

export function GoogleSheetTile({ className = '' }: TileProps) {
  const cell = 'h-[19px] border-b border-r border-[#E2E3E3] px-1 align-middle';
  return (
    <div className={`overflow-hidden rounded-2xl bg-white font-[Arial,Helvetica,sans-serif] shadow-lift ring-1 ring-black/10 ${className}`}>
      {/* Title and menus */}
      <div className="flex items-start gap-2 bg-[#F9FBFD] px-2.5 pb-1 pt-2">
        <svg viewBox="0 0 24 32" className="mt-0.5 h-6 w-[18px] shrink-0">
          <path d="M0 3a3 3 0 013-3h13l8 8v21a3 3 0 01-3 3H3a3 3 0 01-3-3z" fill="#0F9D58" />
          <path d="M16 0l8 8h-5a3 3 0 01-3-3z" fill="#87CEAC" />
          <rect x="5" y="14" width="14" height="11" rx="1" fill="none" stroke="#fff" strokeWidth="1.6" />
          <path d="M5 18.5h14M5 21.5h14M10.5 14v11" stroke="#fff" strokeWidth="1.6" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-[#1F1F1F]">CLIENTS TRACKER — Sep 2026</p>
          <p className="mt-0.5 flex gap-2 truncate text-[9.5px] text-[#444746]">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools'].map((menu) => (
              <span key={menu}>{menu}</span>
            ))}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#C2E7FF] px-2.5 py-1 text-[9.5px] font-medium text-[#001D35]">Share</span>
      </div>

      {/* Toolbar */}
      <div className="mx-2 flex items-center gap-2 overflow-hidden rounded-full bg-[#EDF2FA] px-2.5 py-1 text-[9.5px] text-[#444746]">
        <span>↶</span>
        <span>↷</span>
        <span className="border-l border-[#C7C7C7] pl-2">100%</span>
        <span className="border-l border-[#C7C7C7] pl-2">₹</span>
        <span>%</span>
        <span>.0</span>
        <span className="border-l border-[#C7C7C7] pl-2">Arial</span>
        <span className="font-bold">B</span>
        <span className="italic">I</span>
        <span className="underline decoration-[#E53935] decoration-2">A</span>
      </div>

      {/* Formula bar */}
      <div className="mt-1 flex items-center border-y border-[#E2E3E3] text-[10px] text-[#1F1F1F]">
        <span className="w-11 border-r border-[#E2E3E3] px-1.5 py-0.5">F3</span>
        <span className="px-1.5 italic text-[#747775]">fx</span>
        <span className="py-0.5">PENDING</span>
      </div>

      {/* Grid */}
      <table className="w-full table-fixed border-collapse text-[10px] text-[#1F1F1F]">
        <colgroup>
          <col className="w-[22px]" />
          <col className="w-[17%]" />
          <col className="w-[19%]" />
          <col className="w-[16%]" />
          <col className="w-[15%]" />
          <col className="w-[11%]" />
          <col />
        </colgroup>
        <thead>
          <tr className="bg-[#F8F9FA] text-center text-[9.5px] text-[#444746]">
            <th className="h-[17px] border-b border-r border-[#C4C7C5] font-normal" />
            {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
              <th key={letter} className={`border-b border-r border-[#C4C7C5] font-normal ${letter === 'F' ? 'bg-[#D3E3FD] text-[#0B57D0]' : ''}`}>
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${cell} bg-[#F8F9FA] text-center text-[9.5px] text-[#444746]`}>1</td>
            {['Client', 'Phone no', 'Start date', 'Plan', 'Fees', 'Payment'].map((head) => (
              <td key={head} className={`${cell} truncate bg-[#EFEFEF] font-bold`}>
                {head}
              </td>
            ))}
          </tr>
          {sheetRows.map((row, index) => {
            const [name, phone, start, plan, fees, paid] = row;
            const isSelectedRow = index === 1;
            return (
              <tr key={name}>
                <td className={`${cell} text-center text-[9.5px] ${isSelectedRow ? 'bg-[#D3E3FD] text-[#0B57D0]' : 'bg-[#F8F9FA] text-[#444746]'}`}>{index + 2}</td>
                <td className={`${cell} truncate`}>{name}</td>
                <td className={`${cell} truncate`}>{phone}</td>
                <td className={`${cell} truncate text-right`}>{start}</td>
                <td className={`${cell} truncate`}>{plan}</td>
                <td className={`${cell} text-right`}>{fees}</td>
                <td
                  className={`${cell} truncate text-center text-[9px] ${paymentFill[paid]} ${
                    isSelectedRow ? 'relative outline outline-2 -outline-offset-1 outline-[#1A73E8]' : ''
                  }`}
                >
                  {paid}
                  {isSelectedRow ? <span className="absolute -bottom-[3px] -right-[3px] h-[6px] w-[6px] border border-white bg-[#1A73E8]" /> : null}
                </td>
              </tr>
            );
          })}
          <tr>
            <td className={`${cell} bg-[#F8F9FA] text-center text-[9.5px] text-[#444746]`}>8</td>
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className={`${cell} font-bold`}>TOTAL</td>
            <td className={`${cell} text-right font-bold`}>25500</td>
            <td className={cell} />
          </tr>
          {[9, 10].map((number) => (
            <tr key={number}>
              <td className={`${cell} bg-[#F8F9FA] text-center text-[9.5px] text-[#444746]`}>{number}</td>
              {Array.from({ length: 6 }, (_, index) => (
                <td key={index} className={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 border-t border-[#E2E3E3] bg-[#F9FBFD] px-2 py-1 text-[9.5px] text-[#444746]">
        <span className="px-1 text-[12px] leading-none">+</span>
        <span className="px-1">≡</span>
        <span className="rounded-md bg-[#E1E9F7] px-2 py-0.5 font-medium text-[#0B57D0]">Clients</span>
        <span className="px-2 py-0.5">Weight log</span>
        <span className="px-2 py-0.5">Old clients</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Google Calendar */

type CalendarEvent = { start: number; end: number; title: string; color: string; dark?: boolean };

/** A coach's Wednesday: every reminder is admin that CoachOS would carry. */
const calendarEvents: CalendarEvent[] = [
  { start: 7, end: 7.75, title: "Send Rahul today's workout", color: '#039BE5' },
  { start: 8, end: 8.75, title: 'Call: Neha weekly check-in', color: '#33B679' },
  { start: 9.25, end: 10.25, title: "Update Arjun's diet PDF", color: '#F6BF26', dark: true },
  { start: 11, end: 11.75, title: 'Kabir renewal — ₹2,000 pending', color: '#D50000' },
  { start: 12.25, end: 13, title: 'Reply to 14 chats', color: '#8E24AA' },
];

export function CalendarTile({ className = '' }: TileProps) {
  const firstHour = 7;
  const hours = [7, 8, 9, 10, 11, 12, 13];
  const rowHeight = 30;
  const now = 10.3;
  const label = (hour: number) => (hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`);
  /** 9.25 → "9:15am", as Google Calendar writes an event's start. */
  const clock = (time: number) => {
    const hour = Math.floor(time);
    const minutes = String(Math.round((time - hour) * 60)).padStart(2, '0');
    return `${hour > 12 ? hour - 12 : hour}:${minutes}${hour >= 12 ? 'pm' : 'am'}`;
  };

  return (
    <div className={`overflow-hidden rounded-2xl bg-white font-[Arial,Helvetica,sans-serif] shadow-lift ring-1 ring-black/10 ${className}`}>
      <div className="flex items-center gap-2 px-2.5 py-2 text-[#1F1F1F]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#444746]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px]">September ▾</span>
        <span className="rounded-md border border-[#747775] px-1 text-[9px] font-bold leading-4">23</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7B1FA2] text-[9px] font-bold text-white">A</span>
      </div>
      <div className="flex items-center gap-2 border-b border-[#E2E3E3] px-2.5 pb-1.5">
        <span className="w-8 text-center">
          <span className="block text-[8.5px] font-medium text-[#0B57D0]">WED</span>
          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#0B57D0] text-[12px] text-white">23</span>
        </span>
        <span className="flex-1 truncate rounded bg-[#33B679] px-1.5 py-0.5 text-[9px] font-medium text-white">Sneha plan ends</span>
      </div>

      <div className="relative ml-1 mr-2" style={{ height: hours.length * rowHeight }}>
        {hours.map((hour, index) => (
          <div key={hour} className="absolute inset-x-0 flex" style={{ top: index * rowHeight }}>
            <span className="w-9 -translate-y-1/2 pr-1.5 text-right text-[8px] text-[#70757A]">{index === 0 ? '' : label(hour)}</span>
            <span className="flex-1 border-t border-[#E2E3E3]" />
          </div>
        ))}
        {calendarEvents.map((event) => (
          <div
            key={event.title}
            className={`absolute left-10 right-1 overflow-hidden rounded-[4px] px-1.5 py-0.5 text-[9px] leading-tight ${event.dark ? 'text-[#1F1F1F]' : 'text-white'}`}
            style={{
              top: (event.start - firstHour) * rowHeight + 1,
              height: (event.end - event.start) * rowHeight - 2,
              background: event.color,
            }}
          >
            {/* Short events put the time on the title line, as Google Calendar does. */}
            <span className="block truncate">
              <span className="font-medium">{event.title}</span>, {clock(event.start)}
            </span>
          </div>
        ))}
        {/* Now */}
        <div className="absolute left-9 right-0 flex items-center" style={{ top: (now - firstHour) * rowHeight }}>
          <span className="-ml-1 h-2 w-2 rounded-full bg-[#EA4335]" />
          <span className="h-[2px] flex-1 bg-[#EA4335]" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Phone gallery */

/* Flat illustrations standing in for the photos in a coach's camera roll. */

function Scene({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square h-auto w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill={bg} />
      {children}
    </svg>
  );
}

function SteelPlate({ cx = 50, cy = 52, r = 40 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy + 2} r={r} fill="rgba(0,0,0,0.25)" />
      <circle cx={cx} cy={cy} r={r} fill="#CFD3D6" />
      <circle cx={cx} cy={cy} r={r - 5} fill="#E3E6E8" />
    </>
  );
}

/** Rice, dal, sabzi and a roti on a steel thali. */
function FoodThali() {
  return (
    <Scene bg="#7A4A2B">
      <path d="M0 20h100M0 45h100M0 75h100" stroke="#6A3F24" strokeWidth="1.5" />
      <SteelPlate />
      <ellipse cx="40" cy="60" rx="16" ry="12" fill="#F4F0E4" />
      <circle cx="36" cy="57" r="1.2" fill="#E8E0C8" />
      <circle cx="44" cy="63" r="1.2" fill="#E8E0C8" />
      <circle cx="66" cy="38" r="11" fill="#B9BDC0" />
      <circle cx="66" cy="38" r="8.5" fill="#E0A526" />
      <circle cx="36" cy="34" r="9" fill="#B9BDC0" />
      <circle cx="36" cy="34" r="6.8" fill="#6B8E23" />
      <circle cx="34" cy="33" r="1.4" fill="#9ACD32" />
      <circle cx="65" cy="67" r="13" fill="#D8A55A" />
      <circle cx="61" cy="63" r="1.8" fill="#A8743A" />
      <circle cx="69" cy="70" r="1.5" fill="#A8743A" />
      <circle cx="66" cy="62" r="1.2" fill="#A8743A" />
    </Scene>
  );
}

/** Boiled egg halves on a steel plate, on a red polka-dot cloth. */
function FoodEggs() {
  const halves = [
    [36, 42],
    [52, 38],
    [66, 48],
    [40, 60],
    [56, 60],
    [48, 74],
  ];
  return (
    <Scene bg="#B3302F">
      {[10, 30, 50, 70, 90].flatMap((x) => [8, 28, 88].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#E9A3A0" />))}
      <SteelPlate />
      {halves.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y} rx="8" ry="6" fill="#FBFBF7" />
          <circle cx={x} cy={y} r="3.4" fill="#F2B61E" />
        </g>
      ))}
    </Scene>
  );
}

/** Two fried momos with chutney on a green ceramic plate. */
function FoodMomos() {
  return (
    <Scene bg="#5B3B24">
      <circle cx="52" cy="54" r="42" fill="#6F7F2E" />
      <circle cx="52" cy="54" r="34" fill="#7E8F36" />
      <path d="M28 58c4-16 26-20 34-6l-2 6c-10 6-22 6-32 0z" fill="#F1E3C6" />
      <path d="M28 58c10 6 22 6 32 0l-1 4c-10 5-21 5-30 0z" fill="#D39A4E" />
      <path d="M44 72c4-14 24-18 32-6l-2 6c-10 5-21 5-30 0z" fill="#EFDDBB" />
      <path d="M44 72c9 5 20 5 30 0l-1 4c-9 5-20 5-28 0z" fill="#C98B3F" />
      <circle cx="70" cy="38" r="6" fill="#C0392B" />
    </Scene>
  );
}

/** Mirror selfie in the gym. */
function PhysiqueMirror() {
  return (
    <Scene bg="#26272B">
      <rect x="18" y="4" width="64" height="96" fill="#B08D57" />
      <rect x="22" y="8" width="56" height="92" fill="#3A3D44" />
      <path d="M22 80h56v20H22z" fill="#2E3036" />
      {/* person */}
      <circle cx="50" cy="30" r="7" fill="#B07A55" />
      <path d="M43 26c1-6 13-7 14 0-3-2-10-2-14 0z" fill="#16110E" />
      <path d="M38 42c4-3 20-3 24 0l-2 26H40z" fill="#B07A55" />
      <path d="M40 68h20l2 32H38z" fill="#9A9EA3" />
      <path d="M40 66h20v4H40z" fill="#1C1C1C" />
      <path d="M62 43l6 6-4 8-6-2z" fill="#B07A55" />
      <rect x="60" y="30" width="7" height="12" rx="1.5" fill="#111" transform="rotate(-8 63 36)" />
      <path d="M38 43l-5 14 3 8 4-2-1-8z" fill="#B07A55" />
    </Scene>
  );
}

/** Flexing in a black vest on a terrace. */
function PhysiqueFlex() {
  return (
    <Scene bg="#B8A94A">
      <rect x="70" y="0" width="12" height="100" fill="#8E2A4E" />
      <path d="M0 58h100v42H0z" fill="#2D2F26" />
      <circle cx="46" cy="30" r="7" fill="#A86F4A" />
      <path d="M39 27c0-8 14-9 15-1-4-3-11-3-15 1z" fill="#16110E" />
      <path d="M36 42c5-3 16-3 20 0l-2 28H38z" fill="#121212" />
      <path d="M38 70h16l3 30H35z" fill="#A5A8AC" />
      {/* arms up in a double-biceps pose */}
      <path d="M36 43c-6-1-12 0-14-6 0-5 2-9 6-10l3 3c-2 2-2 4-1 5 3 2 6 2 8 3z" fill="#A86F4A" />
      <path d="M56 43c6-1 12 0 14-6 0-5-2-9-6-10l-3 3c2 2 2 4 1 5-3 2-6 2-8 3z" fill="#A86F4A" />
    </Scene>
  );
}

/** Back pose in front of a gym mirror. */
function PhysiqueBack() {
  return (
    <Scene bg="#2A2B2F">
      <rect x="6" y="8" width="30" height="40" fill="#E5E1D8" />
      <rect x="10" y="12" width="22" height="16" fill="#5D5F66" />
      <circle cx="54" cy="24" r="8" fill="#1A1410" />
      <path d="M36 38c6-6 30-6 36 0l-6 32H42z" fill="#B27B55" />
      <path d="M54 38v30" stroke="#8E5E3F" strokeWidth="1.2" />
      <path d="M36 38l-6 24 4 2 6-16zM72 38l6 24-4 2-6-16z" fill="#B27B55" />
      <path d="M42 70h24l2 30H40z" fill="#9EA1A6" />
      <path d="M42 68h24v4H42z" fill="#161616" />
    </Scene>
  );
}

/** A clip of eggs boiling — shown with a play badge and duration. */
function VideoEggs() {
  return (
    <div className="relative">
      <Scene bg="#161616">
        <rect x="8" y="58" width="84" height="34" rx="4" fill="#E9E9E9" />
        <rect x="16" y="66" width="20" height="8" rx="1" fill="#1B1B1B" />
        <text x="18" y="72.5" fontSize="6" fill="#E53935" fontFamily="monospace">
          1600
        </text>
        <circle cx="52" cy="46" r="28" fill="#A7ADB2" />
        <circle cx="52" cy="46" r="24" fill="#C9D6DC" />
        {[
          [44, 40],
          [56, 38],
          [48, 50],
          [60, 50],
          [52, 44],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="5" ry="4" fill="#FAFAF6" />
        ))}
        <rect x="68" y="60" width="28" height="5" rx="2.5" fill="#C62828" transform="rotate(28 70 62)" />
      </Scene>
      <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-black/55 px-1 text-[8px] font-medium text-white">
        <svg viewBox="0 0 10 10" className="h-1.5 w-1.5" fill="currentColor">
          <path d="M2 1l7 4-7 4z" />
        </svg>
        0:12
      </span>
    </div>
  );
}

/** A screenshot of a UPI payment confirmation. */
function PaymentScreenshot() {
  return (
    <div className="flex aspect-square flex-col items-center justify-center bg-white px-1 text-center font-[Arial,Helvetica,sans-serif]">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1DA851] text-white">
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.2l2.2 2.2 4.8-5" />
        </svg>
      </span>
      <span className="mt-1 text-[11px] font-bold text-[#202124]">₹4,500</span>
      <span className="text-[7px] leading-tight text-[#5F6368]">Paid to Coach Aman</span>
      <span className="mt-0.5 text-[6px] text-[#9AA0A6]">UPI ref 6021…</span>
    </div>
  );
}

/** Something that has nothing to do with coaching. */
function RandomSunset() {
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square h-auto w-full">
      <defs>
        <linearGradient id="sunset-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5B3F8C" />
          <stop offset="0.55" stopColor="#E9795B" />
          <stop offset="1" stopColor="#F6C66A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#sunset-sky)" />
      <circle cx="58" cy="62" r="12" fill="#FFE08A" />
      <path d="M0 70l18-10 16 8 20-14 18 12 28-10v44H0z" fill="#2B2440" />
      <path d="M0 84l24-8 22 6 26-8 28 8v18H0z" fill="#1B1730" />
    </svg>
  );
}

export function GalleryTile({ className = '' }: TileProps) {
  const today: ReactNode[] = [
    <FoodThali key="thali" />,
    <PhysiqueMirror key="mirror" />,
    <FoodEggs key="eggs" />,
    <VideoEggs key="video" />,
    <FoodMomos key="momos" />,
    <PhysiqueBack key="back" />,
  ];
  const yesterday: ReactNode[] = [<PaymentScreenshot key="payment" />, <PhysiqueFlex key="flex" />, <RandomSunset key="sunset" />];
  return (
    <div className={`overflow-hidden rounded-2xl bg-[#101010] text-white shadow-lift ring-1 ring-black/10 ${className}`}>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2.5">
        <span className="text-[13px] font-semibold">Pictures</span>
        <span className="flex gap-2 text-white/80">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" strokeLinecap="round" />
          </svg>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </span>
      </div>
      <p className="px-2.5 pb-1 text-[9.5px] font-medium text-white/70">Today</p>
      <div className="grid grid-cols-3 gap-[2px]">{today}</div>
      <p className="px-2.5 pb-1 pt-2 text-[9.5px] font-medium text-white/70">Yesterday</p>
      <div className="grid grid-cols-3 gap-[2px]">{yesterday}</div>
    </div>
  );
}

/* -------------------------------------------------------- PDF, form, notes */

function Tile({ app, icon, children, className = '' }: { app: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-forest/10 bg-cream px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sage text-forest">{icon}</span>
        <span className="truncate text-xs font-semibold text-charcoal">{app}</span>
      </div>
      <div className="p-3 text-[11px] leading-snug text-charcoal">{children}</div>
    </div>
  );
}

const svg = { viewBox: '0 0 24 24', className: 'h-3 w-3', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function PdfTile({ className }: TileProps) {
  return (
    <Tile app="workout_plan_v3_FINAL.pdf" icon={<svg {...svg}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5" /></svg>} className={className}>
      <p className="text-center font-serif text-xs font-bold underline">WORKOUT PLAN</p>
      <p className="mt-1 font-serif text-[10px]">Name: Rahul · Goal: Fat loss · 4 days/week</p>
      <div className="mt-2 border border-charcoal/40 font-serif text-[10px]">
        <p className="border-b border-charcoal/40 bg-cream px-1 font-bold">DAY 1 — CHEST &amp; TRICEPS</p>
        {[
          ['Flat bench press', '4', '10'],
          ['Incline DB press', '3', '12'],
          ['Tricep pushdown', '3', '12'],
        ].map(([name, sets, reps]) => (
          <p key={name} className="flex border-b border-charcoal/20 px-1 last:border-0">
            <span className="flex-1">{name}</span>
            <span className="w-6">{sets}</span>
            <span className="w-6">{reps}</span>
          </p>
        ))}
      </div>
      <p className="mt-2 font-serif text-[10px] text-terracotta-deep">Send me daily update on WhatsApp after workout.</p>
    </Tile>
  );
}

/** A check-in form in the style of Google Forms: purple rule, white cards on lilac. */
export function FormTile({ className = '' }: TileProps) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-[#F0EBF8] p-2 font-[Arial,Helvetica,sans-serif] shadow-card ring-1 ring-black/5 ${className}`}>
      <div className="overflow-hidden rounded-lg border-t-[6px] border-[#673AB7] bg-white px-3 py-2">
        <p className="text-[13px] text-[#202124]">Weekly check-in</p>
        <p className="mt-0.5 text-[9px] text-[#5F6368]">Fill this every Sunday night</p>
      </div>
      <div className="mt-1.5 rounded-lg bg-white px-3 py-2 text-[10px] text-[#202124]">
        <p>
          How did this week go? <span className="text-[#D93025]">*</span>
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {['Followed the plan fully', 'Missed 1–2 days', 'Struggled this week'].map((option) => (
            <li key={option} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-[#5F6368]" />
              {option}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function StickyNote({ className = '' }: TileProps) {
  return (
    <div className={`rounded-md bg-[#F6E7B4] p-3 font-medium text-[#4A3F16] shadow-card ${className}`}>
      <p className="text-xs leading-5">
        Rahul — renewal due Fri?
        <br />
        Send Neha new diet
        <br />
        Check Arjun&apos;s form video
      </p>
    </div>
  );
}

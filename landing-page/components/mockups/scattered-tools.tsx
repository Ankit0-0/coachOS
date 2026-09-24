import type { ReactNode } from 'react';

/*
  The tools coaching runs on today, drawn as small generic windows: a chat
  app, a spreadsheet, a PDF plan, a form, shared folders, a phone gallery and
  a sticky note. Deliberately unbranded — the point is the pile, not any one
  product — and every name and number is made up.
*/

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

export function ChatTile({ className }: { className?: string }) {
  const chats = [
    { name: 'Priya (client)', text: 'Sir which workout today? 🙏', unread: 2 },
    { name: 'Rahul', text: 'Photo', unread: 1 },
    { name: 'Neha', text: 'Can I swap paneer for tofu?', unread: 3 },
    { name: 'Arjun', text: 'Missed yesterday, sorry', unread: 0 },
  ];
  return (
    <Tile app="Chats" icon={<svg {...svg}><path d="M4 5h16v11H9l-5 4z" /></svg>} className={className}>
      <ul className="space-y-2">
        {chats.map((chat) => (
          <li key={chat.name} className="flex items-center gap-2">
            <span className="h-6 w-6 shrink-0 rounded-full bg-sage" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{chat.name}</span>
              <span className="block truncate text-muted">{chat.text}</span>
            </span>
            {chat.unread ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
                {chat.unread}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Tile>
  );
}

export function SheetTile({ className }: { className?: string }) {
  const rows = [
    ['Priya', '3m', '₹4,500', 'PAID'],
    ['Rahul', '1m', '₹2,000', 'PENDING'],
    ['Neha', '3m', '₹4,500', 'PARTIAL'],
    ['Arjun', '6m', '₹8,000', 'PAID'],
    ['Kabir', '1m', '₹2,000', 'PENDING'],
  ];
  const status: Record<string, string> = {
    PAID: 'bg-sage text-forest',
    PENDING: 'bg-terracotta-soft text-terracotta-deep',
    PARTIAL: 'bg-[#F6EBC4] text-[#6B5510]',
  };
  return (
    <Tile app="Clients tracker — Sep" icon={<svg {...svg}><path d="M4 4h16v16H4zM4 10h16M10 4v16" /></svg>} className={className}>
      <table className="w-full border-collapse whitespace-nowrap text-left text-[10px]">
        <thead>
          <tr className="text-muted">
            {['Client', 'Plan', 'Fees', 'Payment'].map((head) => (
              <th key={head} className="border border-forest/10 px-1 py-0.5 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, plan, fees, paid]) => (
            <tr key={name}>
              <td className="border border-forest/10 px-1 py-0.5">{name}</td>
              <td className="border border-forest/10 px-1 py-0.5">{plan}</td>
              <td className="border border-forest/10 px-1 py-0.5">{fees}</td>
              <td className={`border border-forest/10 px-1 py-0.5 text-[9px] font-bold ${status[paid]}`}>{paid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tile>
  );
}

export function PdfTile({ className }: { className?: string }) {
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
      <p className="mt-2 font-serif text-[10px] text-terracotta-deep">Send me daily update on chat after workout.</p>
    </Tile>
  );
}

export function FormTile({ className }: { className?: string }) {
  return (
    <Tile app="Weekly check-in form" icon={<svg {...svg}><path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" /></svg>} className={className}>
      <p className="font-semibold">How did this week go?</p>
      <ul className="mt-2 space-y-1.5">
        {['Followed the plan fully', 'Missed 1–2 days', 'Struggled this week'].map((option) => (
          <li key={option} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-[1.5px] border-muted" />
            {option}
          </li>
        ))}
      </ul>
      <p className="mt-2 rounded bg-cream px-2 py-1 text-muted">Upload progress photo (optional)</p>
    </Tile>
  );
}

export function FoldersTile({ className }: { className?: string }) {
  return (
    <Tile app="Shared folders" icon={<svg {...svg}><path d="M3 6h7l2 2h9v11H3z" /></svg>} className={className}>
      <ul className="grid gap-1.5">
        {['Physique updates', 'Workout plans', 'Diet plans', 'Client info (old)'].map((folder) => (
          <li key={folder} className="flex items-center gap-1.5 rounded-lg bg-cream px-2 py-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted" fill="currentColor">
              <path d="M3 6h7l2 2h9v11H3z" />
            </svg>
            <span className="truncate">{folder}</span>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

export function GalleryTile({ className }: { className?: string }) {
  // Warm swatches standing in for the meal and progress photos in a camera roll.
  const swatches = ['#E9C9A2', '#C9D6C3', '#D9A88B', '#EADFC8', '#B7C8B5', '#E3B98F', '#CFC2AE', '#DCC7A4', '#BFD0C4'];
  return (
    <Tile app="Gallery" icon={<svg {...svg}><path d="M4 5h16v14H4zM4 15l4.5-4 4 3.5 3-2.5L20 15" /></svg>} className={className}>
      <div className="grid grid-cols-3 gap-1">
        {swatches.map((color, index) => (
          <span key={index} className="aspect-square rounded" style={{ background: color }} />
        ))}
      </div>
      <p className="mt-2 text-muted">Which of these was Priya&apos;s lunch?</p>
    </Tile>
  );
}

export function StickyNote({ className = '' }: { className?: string }) {
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

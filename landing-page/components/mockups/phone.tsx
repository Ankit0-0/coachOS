import type { ReactNode } from 'react';

/**
 * A phone drawn in HTML. The screen is a size container and its contents are
 * sized in em (see .phone-ui in globals.css), so the same mockup reads the
 * same at any width. `label` describes the screen for assistive tech; the
 * drawn UI inside is hidden from it, since none of it is interactive.
 */
export function PhoneFrame({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="img" aria-label={label} className={`phone ${className}`}>
      <div className="phone-screen">
        <div className="phone-ui" aria-hidden="true">
          <StatusBar />
          {children}
        </div>
        {/* Camera cut-out. */}
        <span className="absolute left-1/2 top-[1.9%] h-[2.2%] w-[4.6%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-[1.6em] pb-[0.3em] pt-[0.9em] text-[0.78em] font-semibold">
      <span>9:41</span>
      <span className="flex items-center gap-[0.35em]">
        <svg viewBox="0 0 16 12" className="h-[0.8em] w-auto" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.6" />
          <rect x="4.3" y="5.5" width="3" height="6.5" rx="0.6" />
          <rect x="8.6" y="3" width="3" height="9" rx="0.6" />
          <rect x="12.9" y="0" width="3" height="12" rx="0.6" opacity="0.45" />
        </svg>
        <svg viewBox="0 0 24 12" className="h-[0.8em] w-auto">
          <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" fill="none" stroke="currentColor" opacity="0.5" />
          <rect x="2.5" y="2.5" width="12" height="7" rx="1.2" fill="currentColor" />
          <rect x="21.5" y="4" width="2" height="4" rx="0.8" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

/** The scrolling body of a screen; clips whatever runs past the tab bar. */
export function ScreenBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 flex-1 overflow-hidden px-[1.1em] pt-[0.4em] ${className}`}>{children}</div>;
}

type Tab = { label: string; icon: ReactNode };

const coachTabs: Tab[] = [
  { label: 'Clients', icon: <UsersIcon /> },
  { label: 'Plans', icon: <DocIcon /> },
  { label: 'Profile', icon: <PersonIcon /> },
];

const clientTabs: Tab[] = [
  { label: 'Home', icon: <HomeIcon /> },
  { label: 'Explore', icon: <CompassIcon /> },
  { label: 'Profile', icon: <PersonIcon /> },
];

/** The bottom tab bar of the coach or client app, with one tab active. */
export function TabBar({ app, active }: { app: 'coach' | 'client'; active: string }) {
  const tabs = app === 'coach' ? coachTabs : clientTabs;
  return (
    <div className="grid grid-cols-3 border-t border-app-line bg-app-ink px-[0.6em] pb-[1.1em] pt-[0.55em]">
      {tabs.map((tab) => {
        const isActive = tab.label === active;
        return (
          <div key={tab.label} className="flex flex-col items-center gap-[0.2em]">
            <span
              className={`flex h-[1.9em] w-[3.4em] items-center justify-center rounded-full ${
                isActive ? 'bg-app-accent-soft text-app-accent' : 'text-app-muted'
              }`}
            >
              {tab.icon}
            </span>
            <span className={`text-[0.7em] ${isActive ? 'font-semibold text-app-text' : 'text-app-muted'}`}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A round avatar with initials, the app's fallback when there is no photo. */
export function Initials({ name, tone = 'plain', size = 2.4 }: { name: string; tone?: 'plain' | 'accent' | 'warm'; size?: number }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  const tones = {
    plain: 'bg-app-line text-app-muted',
    accent: 'bg-app-accent-soft text-app-accent',
    warm: 'bg-[#2a1f19] text-[#f0b48f]',
  } as const;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tones[tone]}`}
      style={{ width: `${size}em`, height: `${size}em`, fontSize: '0.85em' }}
    >
      {initials}
    </span>
  );
}

const iconClass = 'h-[1.15em] w-[1.15em]';

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 4.8a3.4 3.4 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M6.3 18.6c1.3-2 3.3-3 5.7-3s4.4 1 5.7 3" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M3.5 10.5L12 3.5l8.5 7V20a1 1 0 01-1 1h-5v-6h-5v6h-5a1 1 0 01-1-1z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

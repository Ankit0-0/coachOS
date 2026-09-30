/**
 * Where the two web apps live. Read at build time, so a change needs a redeploy.
 *
 * Null until both are real URLs: unset, the .env.example placeholder, or
 * anything that isn't http(s) keeps the hero's "Open the web app" hidden
 * rather than shipping a button that leads nowhere.
 */

export type WebApps = { coach: string; client: string };

function realUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // The .env.example placeholders are on example.com.
    if (url.hostname === 'example.com' || url.hostname.endsWith('.example.com')) return null;
    return trimmed;
  } catch {
    return null;
  }
}

// Spelled out in full: Next.js only inlines NEXT_PUBLIC_ values written like this.
const coach = realUrl(process.env.NEXT_PUBLIC_COACH_APP_URL);
const client = realUrl(process.env.NEXT_PUBLIC_CLIENT_APP_URL);

export const WEB_APPS: WebApps | null = coach && client ? { coach, client } : null;

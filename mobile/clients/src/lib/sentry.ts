import * as Sentry from '@sentry/react-native';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Error reporting. Imported by the root layout before anything renders.
 *
 * Without EXPO_PUBLIC_SENTRY_DSN (local development, unless you set one)
 * nothing is sent. The DSN is safe to ship in a build: it can only write.
 */

const configuredDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
// eas.json ships a placeholder until the real DSN is filled in, and EAS refuses
// an empty value — so anything that isn't a URL counts as "no DSN".
const DSN = configuredDsn && /^https?:\/\//.test(configuredDsn) ? configuredDsn : undefined;

/**
 * Field names whose values never leave the device. Mirrors the backend's list
 * in backend/src/config/redaction.ts; there is no shared package to import it
 * from.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'code',
  'resetcode',
  'authorization',
  'cookie',
  'secret',
  'apikey',
]);

/** Request and response bodies are dropped whole: an auth payload is a body. */
const BODY_KEYS = new Set(['body', 'data', 'request_body', 'response_body', 'requestbody', 'responsebody']);

const CENSOR = '[REDACTED]';
const MAX_DEPTH = 10;

function scrub<T>(value: T, depth = 0): T {
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1)) as T;
  const clean: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    clean[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? CENSOR : scrub(inner, depth + 1);
  }
  return clean as T;
}

function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (!breadcrumb.data) return breadcrumb;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(breadcrumb.data)) {
    if (!BODY_KEYS.has(key.toLowerCase())) data[key] = value;
  }
  return { ...breadcrumb, data: scrub(data) };
}

/** `beforeSend`: no body, cookie, token or password ever leaves the device. */
function scrubEvent<E extends Sentry.Event>(event: E): E {
  if (event.request) {
    const { data: _body, cookies: _cookies, ...request } = event.request;
    event.request = scrub(request);
  }
  if (event.extra) event.extra = scrub(event.extra);
  if (event.contexts) event.contexts = scrub(event.contexts);
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  return event;
}

Sentry.init({
  dsn: DSN || undefined,
  enabled: Boolean(DSN),
  // "preview" or "production" from the EAS build profile; a local run is development.
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || (__DEV__ ? 'development' : 'production'),
  sendDefaultPii: false,
  // Native crashes — Java/Kotlin, Objective-C, and C/C++ through the NDK —
  // close the app instantly with no red screen and no JS stack, so they are the
  // crashes with the least other evidence. These are the SDK's defaults; they
  // are spelled out so that no one turns them off without seeing it.
  enableNative: true,
  enableNativeCrashHandling: true,
  enableNdk: true,
  // Breadcrumbs: taps come from Sentry.wrap on the root layout, route changes
  // from useNavigationBreadcrumbs, and network requests from here.
  // `history` is off because on web it would repeat what useNavigationBreadcrumbs
  // records (native has no history API).
  integrations: [Sentry.breadcrumbsIntegration({ fetch: true, xhr: true, console: true, sentry: true, history: false })],
  // No tracesSampleRate: tracing is off to spare the free tier's quota.
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: scrubEvent,
});

/**
 * Records every route change as a breadcrumb, so a crash report says which
 * screen it came from. Sentry's React Navigation integration only does this
 * while tracing is on, and tracing is off.
 */
export function useNavigationBreadcrumbs(): void {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === pathname) return;
    Sentry.addBreadcrumb({
      category: 'navigation',
      type: 'navigation',
      message: `Navigation to ${pathname}`,
      data: { from: previous.current, to: pathname },
    });
    previous.current = pathname;
  }, [pathname]);
}

export { Sentry };

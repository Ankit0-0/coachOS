/**
 * Public pages on the marketing site (landing-page/) that the app links to.
 * Both stores require the privacy policy to be reachable from inside the app.
 *
 * EXPO_PUBLIC_WEBSITE_URL is set per build profile in eas.json. Like the
 * Sentry DSN, anything that isn't a URL (the REPLACE_WITH placeholder) counts
 * as unset, and the links are then hidden rather than pointing nowhere.
 */
const configured = process.env.EXPO_PUBLIC_WEBSITE_URL?.trim().replace(/\/+$/, '') ?? '';

export const WEBSITE_URL = /^https?:\/\//.test(configured) ? configured : null;

export const LEGAL_LINKS = WEBSITE_URL
  ? {
      privacy: `${WEBSITE_URL}/privacy/`,
      terms: `${WEBSITE_URL}/terms/`,
    }
  : null;

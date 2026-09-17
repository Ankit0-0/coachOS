/**
 * Starts Sentry. server.ts imports this before anything else, because Sentry's
 * instrumentation has to load before the modules it patches. It imports only
 * env and the redaction list, neither of which pulls in anything Sentry
 * instruments. Without SENTRY_DSN it does nothing.
 */
import { initSentry } from "./config/sentry.js";

initSentry();

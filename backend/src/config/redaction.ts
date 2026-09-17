/**
 * The one list of sensitive fields, shared by the logger (config/logger.ts) and
 * the error reporter (config/sentry.ts): nothing that is kept out of the logs
 * may reach Sentry either. Deliberately free of imports, because Sentry is
 * initialised from it before anything else loads.
 */

/**
 * Field paths whose values never belong in a log line or an error report,
 * whatever passes them in. A backstop rather than a licence: code still
 * shouldn't log credentials.
 *
 * The bare names catch a field logged at the top level; the `*.` forms catch one
 * nested a level down (`user.password`, `body.token`). `code` is the password
 * reset code — error codes are logged as `reason` so they stay readable.
 */
export const REDACTED_PATHS = [
  "password",
  "newPassword",
  "currentPassword",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "code",
  "codeHash",
  "resetCode",
  "authorization",
  "cookie",
  "secret",
  "jwtSecret",
  "apiKey",
  "resendApiKey",
  "DATABASE_URL",
  "databaseUrl",
  "awsSecretAccessKey",
  "AWS_SECRET_ACCESS_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.newPassword",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.idToken",
  "*.code",
  "*.codeHash",
  "*.authorization",
  "*.secret",
  "*.apiKey",
];

/**
 * The field names in REDACTED_PATHS, lowercased. Pino matches paths; an error
 * report is an arbitrary tree, so it is scrubbed by name at any depth instead —
 * stricter than the paths, never looser.
 */
export const REDACTED_KEYS: ReadonlySet<string> = new Set(
  REDACTED_PATHS.map((path) => (path.split(".").pop() ?? path).toLowerCase()),
);

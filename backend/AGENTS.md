# Backend conventions

Node + Express + TypeScript (ESM, NodeNext) + Prisma + PostgreSQL.

## Feature module structure
Each feature lives in `src/features/<name>/`:
- `routes.ts` — Express router. Validates the request with a Zod schema
  (`safeParse`), calls the matching function in `service.ts`, shapes the
  HTTP response. No business logic here.
- `schemas.ts` — Zod schemas for that feature's request bodies.
- `service.ts` — the actual logic (DB calls via `prisma`, hashing, token
  issuing, etc). Plain async functions taking/returning plain objects.
  On failure, `throw new Error("SOME_CODE")` — a short uppercase string
  constant — and let the route handler decide the HTTP status and
  user-facing text.

Follow this exact split for every new feature (`plan`, `client`,
`assignment`, ...) — don't put Prisma calls in routes.ts or
response-shaping in service.ts.

## Response shape
Success:
```ts
response.status(201).json({ message: "Registration successful.", ...data });
```
Failure: a bare status code, **no response body** — use `sendError(response, status)`
from `utils/http-error.ts`:
```ts
sendError(response, 400);
```
The client never sees why a request failed beyond the HTTP status code. The
actual reason (validation issues, which credential check failed, role
mismatch, etc.) goes to the server log via `logger.debug` (expected/handled
failures) or `logger.error` (unexpected ones) right before the `sendError`
call — see `middleware/auth.ts` and `features/invite/routes.ts` for the
pattern. Never put diagnostic detail in the response body; put it in the log.

## Imports
ESM + NodeNext (`"type": "module"`, `"module": "nodenext"`). Every
relative import MUST end in `.js`, even though the source is `.ts`:
```ts
import { env } from "../config/env.js";   // correct
import { env } from "../config/env";      // wrong — fails at runtime
```

## Environment variables
Never read `process.env` directly outside `src/config/env.ts`. Add new
vars to the `env` object there (`required()` for anything the app can't
run without), and add a matching placeholder to `.example.env`.

## Validation
Every route accepting a body validates it with Zod via `safeParse` before
touching `service.ts` — match `auth/routes.ts`'s exact pattern.

## Auth
- Passwords: `hashPassword`/`verifyPassword` in `utils/password.ts`
  (scrypt, salted, timing-safe compare) — don't introduce bcrypt or
  another hashing lib.
- Tokens: `createAccessToken`/`verifyAccessToken` in `utils/jwt.ts`.
- Protect a route with `requireAuth` (`middleware/auth.ts`), which
  populates `request.user` (`{ id, email, name, role }`).
- No `requireRole` middleware exists yet. For a coach-only or client-only
  route, check `request.user.role` inline for now — add a real
  `requireRole` middleware once more than one or two routes need it.

## Routing
All feature routers mount under `/v1` (`src/router.ts`), e.g.
`/v1/auth/login`. `/` and `/heartbeat` are infra health checks only —
don't add real endpoints there.

## Logging
Use `logger` from `config/logger.ts` (pino) — never `console.log`.
Per-request logging is already global in `app.ts`.

## TypeScript
`strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`
are all on. Fix type errors properly — don't loosen these flags or reach
for `any` / `as unknown as X` to silence them.

## Database
Schema changes go in `prisma/schema.prisma`, applied via `pnpm db:migrate`.
Never hand-edit a generated migration file or run raw SQL against the DB
outside a migration.
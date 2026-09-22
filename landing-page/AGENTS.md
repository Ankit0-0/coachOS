# Landing page

The public marketing site: Next.js (App Router) with Tailwind,
framer-motion and gsap. It has no users, no auth and no database.

## What it may talk to

The backend, and only through the one public endpoint
`POST /v1/early-access` (`NEXT_PUBLIC_API_URL`). Nothing here reads
coach or client data, and nothing here holds a credential — every
`NEXT_PUBLIC_` value ships to the browser.

There are no Next.js API routes. Anything that needs to write to
Postgres belongs in `backend/`, behind a route there, so that one
service owns the database.

## Conventions

- `tailwind.config.ts` holds the palette the mobile apps' themes were
  derived from (`ink`, `panel`, `line`, `muted`, `cream`, `accent`).
  Treat it as the source: don't change a value to suit one section.
- Every "Join Early Access" call to action opens the shared modal
  through `useEarlyAccess().open()` — none of them scroll to an anchor.
  A new call to action does the same.
- Animations are framer-motion, and each one checks
  `prefers-reduced-motion` before it moves anything.

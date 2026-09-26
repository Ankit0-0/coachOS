# Landing page

The public marketing site: Next.js (App Router, static export) with
Tailwind and framer-motion. It has no users, no auth and no database.

## What it may talk to

The backend, and only through the one public endpoint
`POST /v1/early-access` (`NEXT_PUBLIC_API_URL`). Nothing here reads
coach or client data, and nothing here holds a credential — every
`NEXT_PUBLIC_` value ships to the browser.

There are no Next.js API routes. Anything that needs to write to
Postgres belongs in `backend/`, behind a route there, so that one
service owns the database.

The form sends `audience` (COACH / CLIENT) along with email and
platform. The backend doesn't store it yet — its schema drops unknown
keys — so it's lost until a column is added there.

## Conventions

- `tailwind.config.ts` holds two palettes. The site's (`forest`,
  `cream`, `sage`, `terracotta`, `charcoal`, `muted`) is for the page.
  `app.*` is the mobile apps' light theme (`light` in
  `packages/theme/src/themes.ts`) and is only for the phone
  mockups, so they look like the real screens. Don't mix them, and
  don't change a value to suit one section. `terracotta` (3.2:1 on
  cream) is for fills and large type; body-size text uses
  `terracotta-deep`.
- Fonts: DM Sans (`font-sans`) for text, Manrope (`font-display`) for
  headings, via `next/font` in `app/layout.tsx`.
- Every "Join early access" call to action opens the shared modal
  through `useEarlyAccess()` — `open()` for a neutral button,
  `openFor('COACH' | 'CLIENT')` for an audience-specific one. None of
  them scroll to an anchor, and a new call to action does the same.
- Product visuals are coded mockups (`components/mockups/`), not
  screenshots: they scale to any width and carry no real data. Keep them
  faithful to the apps' real screens and wording, and keep the people
  and numbers in them made up.
- Only claim what the apps do today, and nothing about availability
  beyond "pre-launch / early access". No testimonials, user counts or
  ratings until real ones exist.
- Motion: entrance animations are CSS (`.rise-in`, `.reveal` in
  `globals.css`, driven by the inline script in `layout.tsx`), so
  nothing depends on hydration and nothing is hidden without JavaScript.
  Don't put `initial={{ opacity: 0 }}` on server-rendered content.
  framer-motion is only for the modal, which renders client-side.
  Everything honours `prefers-reduced-motion`.

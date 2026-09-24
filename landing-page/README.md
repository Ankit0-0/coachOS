# CoachOS landing page

The pre-launch marketing site for CoachOS: Next.js (App Router), built as a
static export and served by Render. Visitors join early access as a coach or
a client; the signup goes to the backend's `POST /v1/early-access`.

## Local development

From the repo root:

```bash
pnpm install
cp landing-page/.env.example landing-page/.env.local   # points at the backend
pnpm --filter coachos-landing dev
```

The early-access form needs the backend running (`pnpm dev:backend`) to
accept a signup; the rest of the page works without it.

## Build

```bash
pnpm --filter coachos-landing build   # writes static files to out/
```

## Layout

- `app/`: the page, fonts, global styles and the scroll-reveal script
- `components/sections/`: one file per page section
- `components/mockups/`: the phone screens and "scattered tools", drawn in
  HTML/CSS
- `components/early-access/`: the signup modal and its provider
- `lib/early-access.ts`: the one call to the backend

See `AGENTS.md` for conventions.

# CoachOS

pnpm workspace: `backend` (Node/Express/Prisma), `mobile/clients` and
`mobile/coaches` (Expo/React Native), `admin-website` (Vite/React).
Each has its own AGENTS.md with conventions specific to it — read that
one too when working in it.

## Pull requests

Keep PR descriptions to a few short bullet points: what changed, and
anything that needs a decision or a follow-up.

Do NOT write long descriptions, restate the task, walk through files one
by one, list every test added, or explain reasoning already visible in
the diff and its comments.

## Workflow

- Work on a branch; never commit directly to `main`.
- `main` auto-deploys the backend to Render, so it must always be
  deployable.
- Run typecheck and the backend test suite before opening a PR.

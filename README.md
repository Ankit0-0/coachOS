# coachOS

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` or `npm i -g pnpm`)
- Docker (for the local Postgres database)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Backend

```bash
cd backend
cp .example.env .env   # fill in DATABASE_URL, JWT_SECRET, etc.
docker compose up -d   # starts Postgres
pnpm db:migrate         # applies Prisma migrations
```

Run it:

```bash
pnpm dev:backend        # from repo root, or `pnpm dev` inside backend/
```

Backend runs at `http://localhost:4000`, all routes under `/v1`.

## 3. Client app (mobile/clients)

```bash
cd mobile/clients
cp .env.example .env   # set EXPO_PUBLIC_API_URL and Google client IDs if needed
```

Run it:

```bash
pnpm dev:client         # from repo root, or `pnpm start` inside mobile/clients/
```

Then press `w` for web, or scan the QR code with Expo Go for a device.

## 4. Coach app (mobile/coaches)

```bash
cd mobile/coaches
cp .env.example .env   # set EXPO_PUBLIC_API_URL and Google client IDs if needed
```

Run it:

```bash
pnpm dev:coach          # from repo root, or `pnpm start` inside mobile/coaches/
```

## Run everything at once

```bash
pnpm dev                # runs backend + both apps via turbo
```

## Build (EAS)

```bash
eas build -p android --profile preview
```

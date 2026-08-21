# CoachOS backend

## Setup

1. Copy `.example.env` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and `GOOGLE_CLIENT_ID`.
2. Start Postgres with `docker compose up -d`.
3. Apply the schema with `pnpm db:migrate`.
4. Start the API with `pnpm dev`.

## Auth API

- `POST /auth/register`: `{ email, password, name, role }`
- `POST /auth/login`: `{ email, password }`
- `POST /auth/google`: `{ idToken, role? }`
- `GET /me`: requires `Authorization: Bearer <accessToken>`

Roles are `COACH` and `CLIENT`. Emails are trimmed and lowercased before lookup. A verified Google identity is linked to the existing user with the same normalized email, so password and Google sign-in cannot create duplicate users for the same address.

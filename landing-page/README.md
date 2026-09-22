# CoachOS Landing Page

A premium pre-launch landing page for CoachOS, a coaching operations platform for online fitness coaches in India.

## Features

- Premium marketing experience for a pre-launch SaaS
- Responsive hero, workflow, feature, showcase, and early-access sections
- Early access signup form with Supabase persistence
- SEO metadata and polished motion design

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a local environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Add your Supabase values to `.env.local`.
4. Run the app:
   ```bash
   npm run dev
   ```

## Supabase setup

1. Create a Supabase project.
2. Create a table named `early_access_signups` with the following columns:
   - `id` (uuid, primary key, default `gen_random_uuid()`)
   - `created_at` (timestamp with time zone, default `now()`)
   - `name` (text)
   - `email` (text, unique)
   - `whatsapp` (text, nullable)
   - `client_count` (text)
   - `current_workflow` (text)
   - `early_testing_interest` (boolean, default false)
3. Add the project URL and anon key to `.env.local`.

## Deploying to Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add the Supabase environment variables in Vercel project settings.
4. Deploy.

# Store release checklist

What has to be set up outside the code before the two apps can go to the
Play Store and App Store. The code side is done; every item here needs an
account, a console, or a secret.

The apps: **CoachOS** (`mobile/clients`, `com.ankit00.clients`) and
**CoachOS Coach** (`mobile/coaches`, `com.ankit00.coaches`).

## 1. Backend (Render → Environment)

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | A Resend API key. |
| `RESEND_FROM_EMAIL` | An address on a domain verified in Resend, e.g. `CoachOS <no-reply@yourdomain.com>`. The default `onboarding@resend.dev` only delivers to the Resend account owner, so nobody else gets reset codes. |
| `GOOGLE_CLIENT_ID` | The Google **web** client ID. (Native sign-in mints tokens for it.) Add the iOS client ID after a comma if you create one. |
| `APPLE_BUNDLE_IDS` | `com.ankit00.clients,com.ankit00.coaches` |
| `SENTRY_DSN` | The backend's Sentry DSN. |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` | Needed for photo uploads. |

Optional: `EXPO_ACCESS_TOKEN` (only with Expo's "enhanced push security"),
and the rate limits (`AUTH_RATE_LIMIT_MAX`, `PASSWORD_RESET_RATE_LIMIT_MAX`,
`API_RATE_LIMIT_MAX`). The server logs an error on start for anything
important that is missing.

Deploying runs `prisma migrate deploy`, which adds the push-token table and
the new check-in and subscription columns.

## 2. Google sign-in (Google Cloud console, project of the web client ID)

1. **Android:** create an OAuth client of type *Android* for each package
   (`com.ankit00.clients`, `com.ankit00.coaches`) with the SHA-1 of the
   signing key. Get it from `eas credentials` (and, once on Play, also add
   the *App signing key* SHA-1 from Play Console → App integrity). Without
   it sign-in fails with `DEVELOPER_ERROR`. No client ID goes in the app.
2. **iOS:** create an OAuth client of type *iOS* for each bundle ID, and set
   its client ID as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` for that app in EAS.
   `app.config.ts` turns it into the URL scheme iOS needs.
3. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (the web client ID) for both apps in
   EAS. Local `.env` files are not uploaded to EAS builds.
4. OAuth consent screen: publish it (out of "Testing"), with the privacy
   policy URL.

## 3. Sign in with Apple

Enable the *Sign in with Apple* capability for both App IDs in the Apple
Developer portal (EAS does this on the first build if it manages
credentials). Nothing else: the backend checks tokens against Apple's
public keys.

## 4. Push notifications

- **iOS:** EAS creates the APNs key on the first `eas build -p ios`
  (answer yes when asked about push notifications).
- **Android:** create a Firebase project with an Android app for each
  package, download each `google-services.json`, and add it to that app in
  EAS as a *file* environment variable named `GOOGLE_SERVICES_JSON`. Then
  upload an FCM V1 service-account key: `eas credentials` → Android →
  Google Service Account → FCM V1.

Reminders are local notifications and need neither.

## 5. EAS build variables (both apps, `eas.json` or EAS environment variables)

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_WEBSITE_URL` | The landing page's public URL. The in-app privacy policy and terms links point at `/privacy/` and `/terms/` there; they are hidden until this is a URL. |
| `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Replace the `REPLACE_WITH_…` placeholders. |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | See section 2. |

## 6. Landing page

Deploy it so `/privacy/`, `/terms/` and `/delete-account/` are live, and
update `openGraph.url` in `landing-page/app/layout.tsx` from the
`coachos.example.com` placeholder. Have the privacy policy and terms read
by someone qualified for the countries you launch in.

## 7. Store listings

- **Both stores:** privacy policy URL (`/privacy/`), support email, app
  screenshots, description, and **reviewer accounts**: an *approved* coach
  and a client who is that coach's client with a workout and diet plan
  assigned. To make them: sign up the client in the app, then run
  `backend/scripts/seed-demo.ts --client=<that email>` with
  `DEMO_COACH_PASSWORD` set, which creates an approved demo coach with that
  password and gives the client demo plans and history (see the script's
  header for the dry run). A pending coach only sees the approval screen,
  which reviewers reject.
- **Google Play:** Data safety form (account info, health and fitness,
  photos, app activity, device IDs for push, crash logs; all encrypted in
  transit; deletable), the account-deletion URL (`/delete-account/`),
  Health apps declaration, content rating. A new personal developer account
  must run a closed test with at least 12 testers for 14 days before
  production.
- **App Store:** privacy "nutrition label" with the same data types, age
  rating, and export compliance is pre-answered (`ITSAppUsesNonExemptEncryption: false`).

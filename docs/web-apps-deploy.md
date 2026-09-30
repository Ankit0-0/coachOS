# Web apps on Render

Both mobile apps also ship as web builds: two Render **static sites**, set up
like the admin site. Each needs its own subdomain — web storage is per
origin, so two apps on one origin would share a session.

## 1. The two static sites

| Setting | Coach app | Client app |
|---|---|---|
| Root Directory | `mobile/coaches` | `mobile/clients` |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --filter coaches... && pnpm build:web` | `corepack enable && pnpm install --frozen-lockfile --filter clients... && pnpm build:web` |
| Publish Directory | `dist` | `dist` |
| Redirects/Rewrites | Source `/*`, Destination `/index.html`, Action **Rewrite** | same |

The rewrite is what makes a refresh or a shared link on a nested route
(`/clients/<id>`) work: the build is a single-page app with one `index.html`.

## 2. Environment (each static site)

These are read at build time, so changing one needs a redeploy.

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://coachos-fxor.onrender.com/v1` |
| `EXPO_PUBLIC_SENTRY_DSN` | That app's Sentry DSN. Web reports JS errors only. |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | `production` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | The Google **web** client ID. Unset hides the Google button. |
| `EXPO_PUBLIC_WEBSITE_URL` | The landing page URL, for the privacy and terms links. |

## 3. Backend (Render → Environment)

Add both new origins to `CLIENT_URL`, comma-separated, next to the admin site
and landing page — otherwise every request fails CORS. Exact origins: scheme
and host, no trailing slash.

## 4. Google Cloud console (the web client ID)

Add each app's origin, e.g. `https://coach.example.com`, to both
**Authorized JavaScript origins** and **Authorized redirect URIs**. The
sign-in popup returns to the bare origin, with no path.

## 5. S3 bucket CORS

Photos upload from the browser straight to S3 with a presigned URL, so the
bucket's own CORS configuration must allow both origins too (`CLIENT_URL`
doesn't cover it):

```json
[
  {
    "AllowedOrigins": ["https://coach.example.com", "https://app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3000
  }
]
```

Keep any origins the bucket already allows.

# Build from the repository ROOT, not backend/: this is a pnpm workspace and the
# lockfile lives at the root.
#
#   docker build -f backend/Dockerfile -t coachos-backend .

# ---------------------------------------------------------------------------
# deps: install only what the backend needs. Copying manifests before source
# means this layer is rebuilt when the lockfile changes, not on every edit.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Corepack reads the pinned version from the root package.json's packageManager.
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/

# Dev dependencies are installed on purpose and never pruned: `start` runs
# TypeScript through tsx, so tsx has to be present at runtime.
RUN pnpm install --frozen-lockfile --filter backend...

# ---------------------------------------------------------------------------
# build: add the source and generate the Prisma client. There is no postinstall
# hook, so without this step @prisma/client has nothing to import at runtime.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY backend/ backend/

# prisma.config.ts reads DATABASE_URL eagerly. Generating the client never
# connects, so a placeholder is enough here; the real value comes at runtime.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm --filter backend exec prisma generate

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

RUN corepack enable

# The node image ships an unprivileged `node` user.
COPY --from=build --chown=node:node /app /app

USER node
WORKDIR /app/backend

# Fetch pnpm now, as the user that will run it, so a cold start never has to
# download it before the server can boot.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN pnpm --version

EXPOSE 4000

# Liveness only: `/heartbeat` never touches the database, so a Postgres blip
# doesn't get a healthy container restarted.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/heartbeat" >/dev/null || exit 1

CMD ["pnpm", "start:prod"]
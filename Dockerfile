# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY turbo.json ./

RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the web frontend (needs VITE_CESIUM_TOKEN at build time)
ARG VITE_CESIUM_TOKEN
ENV VITE_CESIUM_TOKEN=$VITE_CESIUM_TOKEN

RUN pnpm turbo run build

# ── Stage 2: API runtime ─────────────────────────────────────────────────────
FROM node:22-alpine AS api

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/data ./apps/api/data
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

ENV NODE_ENV=production
EXPOSE 3001

USER node
CMD ["node", "apps/api/dist/server.js"]

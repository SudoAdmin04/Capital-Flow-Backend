# syntax=docker/dockerfile:1

# --- Etapa de construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# El lockfile y pnpm-workspace.yaml son necesarios: este último declara
# allowBuilds (aprobación de scripts de @nestjs/core, esbuild, etc.).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# --- Etapa de producción ---
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node
EXPOSE 10000

CMD ["./docker-entrypoint.sh"]

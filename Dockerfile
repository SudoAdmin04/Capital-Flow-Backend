# --- Etapa de Construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Añadimos --allow-build=* para permitir scripts en la fase de build
RUN pnpm install --frozen-lockfile --unsafe-perm --allow-build=*

COPY . .
RUN pnpm build

# --- Etapa de Producción ---
FROM node:22-alpine AS stage-1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Instalamos dependencias de producción permitiendo los scripts necesarios automáticamente
RUN pnpm install --frozen-lockfile --prod --allow-build=*

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]
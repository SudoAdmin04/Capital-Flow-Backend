# --- Etapa de Construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Permite la ejecución de scripts necesarios durante la instalación
RUN pnpm install --frozen-lockfile --unsafe-perm

COPY . .
RUN pnpm build

# --- Etapa de Producción ---
FROM node:22-alpine AS stage-1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Instalamos SOLAMENTE las dependencias de producción permitiendo los scripts necesarios
RUN pnpm install --frozen-lockfile --prod --unsafe-perm

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]
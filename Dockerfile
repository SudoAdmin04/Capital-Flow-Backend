# --- Etapa de Construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Forzamos a pnpm a permitir la ejecución de scripts globalmente en el entorno de Docker
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml ./

# Instalamos permitiendo todos los scripts de compilación mediante configuración de pnpm
RUN pnpm install --frozen-lockfile --config.enable-pre-post-scripts=true

COPY . .
RUN pnpm build

# --- Etapa de Producción ---
FROM node:22-alpine AS stage-1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml ./

# Instalamos las dependencias de producción permitiendo los scripts necesarios
RUN pnpm install --frozen-lockfile --prod --config.enable-pre-post-scripts=true

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]
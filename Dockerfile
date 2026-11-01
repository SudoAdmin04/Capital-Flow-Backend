# --- Etapa de Construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Forzamos a pnpm a permitir la ejecución de scripts globalmente en el entorno de Docker
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml ./

COPY . .
RUN pnpm build

# --- Etapa de Producción ---
FROM node:22-alpine AS stage-1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml ./

# Instalamos SOLAMENTE las dependencias de producción permitiendo los scripts necesarios
RUN pnpm install --frozen-lockfile --prod --ignore-scripts=false

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]
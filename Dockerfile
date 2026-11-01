# --- Etapa de Construcción ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


# --- Etapa de Producción ---
FROM node:22-alpine AS stage-1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos los archivos de definición de paquetes
COPY package.json pnpm-lock.yaml ./

# Instalamos SOLAMENTE las dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiamos el código compilado desde la etapa anterior
COPY --from=build /app/dist ./dist

# Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]
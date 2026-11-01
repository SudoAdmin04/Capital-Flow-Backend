# ---- Etapa de Construcción ----
FROM node:22-alpine AS build
WORKDIR /app

# Habilitar corepack para gestionar pnpm de forma nativa
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias (incluyendo pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias con pnpm
RUN pnpm install --frozen-lockfile

# Copiar el código fuente y compilar
COPY . .
RUN pnpm build

# ---- Etapa de Producción ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción de forma limpia
RUN pnpm install --frozen-lockfile --prod

# Copiar los artefactos compilados desde la etapa anterior
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3001
CMD ["node", "dist/main"]
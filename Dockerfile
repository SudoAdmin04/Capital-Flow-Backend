# ---- Etapa de Construcción ----
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Permitir explícitamente los scripts de compilación requeridos por NestJS
RUN pnpm config set only-built-dependencies '["@nestjs/core"]' --global
RUN pnpm install --frozen-lockfile --shamefully-hoist=false

COPY . .
RUN pnpm build

# ---- Etapa de Producción ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Instalar dependencias de producción permitiendo los scripts necesarios
RUN pnpm config set only-built-dependencies '["@nestjs/core"]' --global
RUN pnpm install --frozen-lockfile --prod --ignore-scripts=false

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3001
CMD ["node", "dist/main"]
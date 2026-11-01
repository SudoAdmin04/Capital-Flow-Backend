# AGENTS.md

## Stack & layout

- NestJS 10 + TypeORM 0.3 + PostgreSQL; TypeScript compiled to CommonJS (`tsconfig.json`).
- Package manager is **pnpm** (Dockerfile and `pnpm-lock.yaml` are authoritative; a `package-lock.json` also exists but is not used by the scripts).
- Code lives in `src/modules/<domain>/` as `*.entity.ts`, `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`. Register new modules in `src/app.module.ts`.
- Shared building blocks: `src/common/` (base/owned entities, enums, decimal transformer, guards, decorators, filters), `src/config/` (env validation), `src/database/` (data source, migrations, seed script).

## Commands

```bash
pnpm install
pnpm run start:dev     # watch mode, API at http://localhost:${PORT}/api
pnpm run build         # nest build -> dist/
pnpm run start:prod    # node dist/main
pnpm run seed          # ts-node src/database/seeds/seed.ts (uses SEED_* env vars)
pnpm run migration:run        # CLI sobre src/database/data-source.ts (ts-node)
pnpm run migration:revert
pnpm run migration:generate -- src/database/migrations/Name
pnpm run migration:run:prod   # CLI sobre dist/database/data-source.js (requiere pnpm build)
pnpm run migration:revert:prod
```

- There is **no test, lint, or format script/config**. Verify changes with `pnpm run build` plus manual HTTP calls.
- `PORT` comes from `.env` (currently `4002`); Swagger is at `/api/docs` and is disabled when `NODE_ENV=production`.
- All routes are under the `/api` global prefix.
- `GET /api/health` (público) hace `SELECT 1`; es el health check de Render y no pasa por RBAC.

## Auth & RBAC

- JWT is enforced globally (`JwtAuthGuard` in `app.module.ts`); opt out per handler/class with `@Public()`.
- Auth routes are `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/profile` — **not** the `/auth/register` and `/auth/me` paths the README mentions.
- Use `@UsuarioActual()` (alias `@CurrentUser()`) to get the caller. Its normalized `userId` comes from `userId`/`sub`/`id`; `JwtStrategy` re-loads the user and recomputes RBAC permissions on every request.
- RBAC model: `roles` (integer id) → `role_screens` (CRUD flags) → `screens`; permissions are embedded in the JWT at login/refresh. `AdminGuard` is only applied to `/users`; `/roles`, `/screens`, and `/role-screens` currently require JWT only, so add `AdminGuard` yourself for new admin-only routes.
- Registration auto-assigns the first active non-admin role and seeds the default category catalog.

## Data & API conventions

- User-scoped entities extend `OwnedEntity` (adds `userId`, FK cascade); others extend `AppBaseEntity` (UUID id + timestamptz timestamps).
- Services take `userId` as the first argument and must validate that referenced accounts/categories/debts belong to that user. Never trust ids from the request alone.
- Money columns are `DECIMAL(14,2)` mapped to `number` via `decimalTransformer`; round computed values with `round2` from `common/decimal.transformer`. Enums live in `src/common/enums.ts`.
- Success responses are wrapped by `TransformInterceptor`: `{ message, ...data }`, arrays become `{ message, items: [...] }`. Decorate handlers with `@ResponseMessage()` and `@ApiGlobalResponse()`; do not hand-build the envelope. Errors are normalized by `HttpExceptionFilter` to `{ statusCode, message, path, timestamp }`.
- Two pagination styles coexist: newer catalog endpoints (`/users`, `/roles`, `/screens`, `/role-screens`, `/notifications`, `/categories`) expose `GET .../paginado` with `PaginationQueryDto` (`pagina`, `registros`, `buscar`); other lists (e.g. transactions) use `page`/`limit`. Match the surrounding controller.
- `GET /api/exports/*` writes PDF/XLSX buffers directly with `@Res()`, bypassing the response interceptor.
- DTO/field naming mixes English and Spanish (e.g. `concept`, `pagina`, `buscar`). `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted`, so unknown fields return 400.

## Database gotchas

- `DATABASE_URL` takes precedence over `DB_*` values. `.env` is gitignored; the local `.env` points at a Neon database.
- TLS se resuelve en `src/config/database.config.ts` (compartido por `app.module.ts` y `src/database/data-source.ts`): solo se activa si la URL trae `sslmode=require|verify-ca|verify-full` o `DB_SSL=true`. Render interno y `postgres` local van sin TLS; Neon/externo con `?sslmode=require`.
- Dev relies on `DB_SYNCHRONIZE=true`; env validation rejects it when `NODE_ENV=production`.
- Las migraciones hoy cubren todo el esquema: `InitialSchema`, `AddSavingsGoalEntries` y `AddRbacNotificationsAndCalendar` (roles, screens, role_screens, `users.roleId`, notifications, budget_calendar_events). En una base nueva, `migration:run` crea el esquema completo.
- `schema:log` sigue reportando drift cosmético (nombres de constraints/índices explícitos vs. hashes de TypeORM). No rompe el deploy, pero revisa el SQL antes de generar una migración nueva.
- Migrations use `uuid_generate_v4()`, so Postgres needs the `uuid-ossp` extension (la crean las migraciones con `CREATE EXTENSION IF NOT EXISTS`).

## Seeding

- `pnpm run seed` creates/updates `SEED_USER_EMAIL` as admin, base accounts/categories, and (when `SEED_DEMO_DATA=true`) October 2025 demo data used to validate dashboard totals (income 20,100, expenses 26,619, net -6,519).
- `GET /api/seed` is **public** and runs a different, idempotent seeder (`SeedService` + `src/modules/seed/data/inicio.ts`) that also creates roles, screens, role-screen permissions, and users such as `superAdmin@god.com`. Use it when you need the full RBAC catalog; avoid hitting it against a real database. It never truncates.

## Repo quirks worth knowing

- `README.md` contains unresolved merge-conflict markers and is outdated (wrong auth paths, port 3001, `/reports`-only view). Treat code + `package.json` as truth.
- Two dashboard surfaces exist: `/api/dashboard/*` is the richer, current one (used by PDF/XLSX exports); `/api/reports/*` (`dashboard`, `budget-overview`, `analytics`) is the older summary API.
- Domain nesting to be aware of: budget calendar lives at `/api/budgets/calendar` (module under `budgets/calendar/`); savings goals expose `/api/savings-goals/:id/deposits|withdrawals|entries`; users catalog endpoints are admin-only.
- `Dockerfile` es multi-stage: instala deps con `pnpm install --frozen-lockfile` (build) y `--prod` (runtime), compila `dist/` y arranca con `docker-entrypoint.sh` como usuario `node`. `pnpm-workspace.yaml` es obligatorio en la imagen porque declara `allowBuilds` (sin él pnpm 11+ falla con `ERR_PNPM_IGNORED_BUILDS`).
- `docker-entrypoint.sh` corre `migration:run` (con reintentos, `MIGRATION_ATTEMPTS`/`MIGRATION_RETRY_SECONDS`) salvo `RUN_MIGRATIONS=false`, y luego `node dist/main.js`. Como Render no ofrece `preDeployCommand` en el plan free, las migraciones se aplican al arrancar el contenedor.
- `.dockerignore` excluye `node_modules`, `dist`, `.env` y docs: el build no depende de archivos del host.

## Despliegue en Render

- `render.yaml` define el web service Docker `capital-flow-api` (health check `/api/health`, `plan: free`). No crea base de datos: usa la Neon existente vía `DATABASE_URL` (definida a mano en el dashboard, con `?sslmode=require`).
- `RUN_MIGRATIONS=false` en la blueprint porque Neon ya tiene el esquema creado con `DB_SYNCHRONIZE=true` y no existe tabla `migrations`; con `true`, TypeORM intentaría crear tablas existentes y el contenedor no arrancaría.
- Si algún día migras a una base nueva (incluida Render Postgres): define `DATABASE_URL` a esa base, pon `RUN_MIGRATIONS=true` y las migraciones crean el esquema completo.
- Para "baseline" de Neon y poder usar migraciones ahí: con la app detenida, inserta manualmente las filas correspondientes en una tabla `migrations` creada por TypeORM (`CREATE TABLE migrations (...)`, luego `migration:run` no re-ejecuta lo ya aplicado). Alternativa más simple: volcar/restaurar en una base nueva con `RUN_MIGRATIONS=true`.
- Variables mínimas a definir en el dashboard: `DATABASE_URL` (Neon) y `CORS_ORIGINS` (URL del frontend, separadas por coma). `JWT_SECRET` y `SEED_TOKEN` se generan solos con `generateValue: true`.
- En producción `GET /api/seed` exige el header `x-seed-token` igual a `SEED_TOKEN`; sin esa variable siempre responde 401.
- Render inyecta `PORT`; el contenedor escucha en `0.0.0.0` y usa `4002` solo como fallback local.

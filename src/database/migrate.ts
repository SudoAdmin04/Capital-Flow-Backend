import 'dotenv/config';
import dataSource from './data-source';

/**
 * Runner de migraciones pensado para contenedores (Render).
 *
 * Problema que resuelve: la base actual de Neon fue creada con
 * `DB_SYNCHRONIZE=true`, así que ya tiene las tablas pero NO tiene la tabla
 * `migrations`. Si TypeORM ejecutara todas las migraciones fallaría con
 * "relation already exists".
 *
 * Estrategia:
 *   1. Solo se hace "baseline" de las migraciones NO idempotentes, y únicamente
 *      cuando su tabla marcadora ya existe (es decir, la base se creó con
 *      synchronize). Se inserta la fila en `migrations` para que TypeORM no la
 *      vuelva a ejecutar.
 *   2. El resto de migraciones son idempotentes (IF NOT EXISTS) y se ejecutan
 *      normalmente, de modo que también crean lo que falte.
 *
 * Todo es idempotente: en una base vacía no hay baseline y se aplican todas.
 */

type Baseline = {
  timestamp: number;
  name: string;
  /** Tabla que crea la migración; si existe, asumimos que ya estaba aplicada. */
  markerTable: string;
};

const BASELINES: Baseline[] = [
  {
    timestamp: 1791296383291,
    name: 'InitialSchema1791296383291',
    markerTable: 'users',
  },
  {
    timestamp: 1791296383292,
    name: 'AddSavingsGoalEntries1791296383292',
    markerTable: 'savings_goal_entries',
  },
];

async function tableExists(table: string): Promise<boolean> {
  const rows: Array<unknown> = await dataSource.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = $1
      LIMIT 1`,
    [table],
  );
  return rows.length > 0;
}

async function ensureMigrationsTable(): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL,
      CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
    )
  `);
}

async function applyBaselines(): Promise<void> {
  for (const baseline of BASELINES) {
    if (!(await tableExists(baseline.markerTable))) continue;

    const existing: Array<unknown> = await dataSource.query(
      `SELECT 1 FROM "migrations" WHERE "timestamp" = $1 LIMIT 1`,
      [baseline.timestamp],
    );
    if (existing.length > 0) continue;

    await dataSource.query(
      `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
      [baseline.timestamp, baseline.name],
    );
    console.log(
      `[migrate] baseline aplicado: ${baseline.name} (tabla "${baseline.markerTable}" ya existía)`,
    );
  }
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await ensureMigrationsTable();
    await applyBaselines();

    const applied = await dataSource.runMigrations({ transaction: 'each' });
    if (applied.length === 0) {
      console.log('[migrate] Sin migraciones pendientes.');
    } else {
      for (const migration of applied) {
        console.log(`[migrate] aplicada: ${migration.name}`);
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[migrate] Error: ${message}`);
  process.exit(1);
});

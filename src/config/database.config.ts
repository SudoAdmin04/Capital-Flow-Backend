type EnvReader = (key: string, fallback?: string) => string | undefined;

/**
 * Builds the Postgres connection options shared by the Nest runtime and the
 * TypeORM CLI (migrations).
 *
 * TLS: Render internal connections work without TLS, while external/Neon URLs
 * usually require it. We only enable SSL when the URL asks for it via
 * `sslmode=require|verify-ca|verify-full` (or DB_SSL=true). `verify-full` is
 * downgraded to `rejectUnauthorized: false` because managed providers
 * (Render, Neon) use certificates not present in the container trust store.
 */
export function resolveSsl(
  databaseUrl: string | undefined,
  dbSsl: string | undefined,
): boolean | { rejectUnauthorized: boolean } {
  if (dbSsl === 'true') return { rejectUnauthorized: false };
  if (dbSsl === 'false') return false;
  if (!databaseUrl) return false;

  try {
    const mode = new URL(databaseUrl).searchParams.get('sslmode');
    return mode && mode !== 'disable' ? { rejectUnauthorized: false } : false;
  } catch {
    return false;
  }
}

export function buildPostgresOptions(get: EnvReader) {
  const databaseUrl = get('DATABASE_URL');
  if (databaseUrl) {
    return {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl: resolveSsl(databaseUrl, get('DB_SSL')),
    };
  }

  return {
    type: 'postgres' as const,
    host: get('DB_HOST', 'localhost'),
    port: parseInt(get('DB_PORT', '5432') ?? '5432', 10),
    username: get('DB_USER', 'finanzas'),
    password: get('DB_PASSWORD', 'finanzas'),
    database: get('DB_NAME', 'finanzas'),
    ssl: resolveSsl(undefined, get('DB_SSL')),
  };
}

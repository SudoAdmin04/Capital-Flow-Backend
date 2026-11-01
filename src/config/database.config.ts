type EnvReader = (key: string, fallback?: string) => string | undefined;

/**
 * Hosts que viven en la red local/Docker y por tanto no hablan TLS.
 * `host.docker.internal` es el caso típico al probar la imagen contra
 * un Postgres en el host.
 */
const INTERNAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  'host.containers.internal',
]);

/**
 * Detecta hosts internos: localhost, nombres de un solo label (`db`,
 * `postgres`, `dpg-xxxx-a` de Render) y sufijos `.local` / `.internal`.
 * Cualquier host con dominio público (Neon, Render externo, Supabase...)
 * se considera remoto y requiere TLS.
 */
export function isInternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (INTERNAL_HOSTS.has(host)) return true;
  if (!host.includes('.')) return true;
  return host.endsWith('.local') || host.endsWith('.internal');
}

/**
 * Resuelve la configuración TLS compartida por el runtime de Nest y el CLI
 * de TypeORM.
 *
 * Prioridad:
 *   1. `DB_SSL=true|false` explícito.
 *   2. `sslmode` de la URL (`disable` desactiva; cualquier otro modo activa).
 *   3. Detección por host: TLS en hosts remotos (Neon, Render externo),
 *      sin TLS en hosts internos/Docker.
 *
 * `rejectUnauthorized` queda en `false` porque Neon y Render usan
 * certificados que no están en el trust store de la imagen; la conexión
 * sigue cifrada, solo no valida la CA. Si necesitas validación estricta,
 * monta la CA y ajusta este archivo.
 */
export function resolveSsl(
  databaseUrl: string | undefined,
  dbSsl: string | undefined,
  hostname?: string,
): false | { rejectUnauthorized: boolean } {
  if (dbSsl === 'true') return { rejectUnauthorized: false };
  if (dbSsl === 'false') return false;

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const mode = url.searchParams.get('sslmode');
      if (mode) return mode === 'disable' ? false : { rejectUnauthorized: false };
      return isInternalHost(url.hostname) ? false : { rejectUnauthorized: false };
    } catch {
      return false;
    }
  }

  return hostname && !isInternalHost(hostname) ? { rejectUnauthorized: false } : false;
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

  const host = get('DB_HOST', 'localhost');
  return {
    type: 'postgres' as const,
    host,
    port: parseInt(get('DB_PORT', '5432') ?? '5432', 10),
    username: get('DB_USER', 'finanzas'),
    password: get('DB_PASSWORD', 'finanzas'),
    database: get('DB_NAME', 'finanzas'),
    ssl: resolveSsl(undefined, get('DB_SSL'), host),
  };
}

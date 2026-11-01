#!/bin/sh
# Ejecuta migraciones antes de arrancar salvo RUN_MIGRATIONS=false.
# Útil para Render Postgres nuevo. Si reutilizas una base ya creada con
# DB_SYNCHRONIZE=true, define RUN_MIGRATIONS=false.
#
# Reintenta porque en Render la instancia de Postgres puede tardar unos
# segundos en aceptar conexiones después de un deploy o un reinicio.
set -e

MAX_INTENTOS="${MIGRATION_ATTEMPTS:-10}"
ESPERA="${MIGRATION_RETRY_SECONDS:-5}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Ejecutando migraciones..."
  intento=1
  while true; do
    if node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js; then
      break
    fi
    if [ "$intento" -ge "$MAX_INTENTOS" ]; then
      echo "[entrypoint] Las migraciones fallaron tras $intento intentos." >&2
      exit 1
    fi
    intento=$((intento + 1))
    echo "[entrypoint] Reintentando en ${ESPERA}s ($intento/$MAX_INTENTOS)..."
    sleep "$ESPERA"
  done
fi

exec node dist/main.js

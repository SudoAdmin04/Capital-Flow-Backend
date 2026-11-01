#!/bin/sh
# Ejecuta migraciones antes de arrancar salvo RUN_MIGRATIONS=false.
#
# `dist/database/migrate.js` hace baseline automático cuando la base ya
# existe (creada con DB_SYNCHRONIZE=true) y luego aplica las pendientes.
#
# Reintenta porque en Render/Neon la base puede tardar unos segundos en
# aceptar conexiones después de un deploy o de despertar (free tier).
set -e

MAX_INTENTOS="${MIGRATION_ATTEMPTS:-10}"
ESPERA="${MIGRATION_RETRY_SECONDS:-5}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Ejecutando migraciones..."
  intento=1
  while true; do
    if node dist/database/migrate.js; then
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

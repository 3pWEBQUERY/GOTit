#!/usr/bin/env bash
# Lasttest der Suche (Schritt 1.14), nur gegen die LOKALE Datenbank.
#   scripts/load/run.sh seed [Anzahl]   synthetische Profile laden (Standard 10000)
#   scripts/load/run.sh cleanup         alles mit Präfix load_ entfernen
#   scripts/load/run.sh core [Clients…] Kernfunktion parallel messen (Standard 20 50)
#   scripts/load/run.sh http <URL>      HTTP-Route messen (lokaler Produktions-Build)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
set -a; source "$ROOT/.env"; set +a
case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*) ;;
  *) echo "Abbruch: DATABASE_URL zeigt nicht auf localhost." >&2; exit 1 ;;
esac
cmd="${1:-}"; shift || true
case "$cmd" in
  seed) psql "$DATABASE_URL" -v count="${1:-10000}" -f "$ROOT/scripts/load/seed.sql" ;;
  cleanup) psql "$DATABASE_URL" -f "$ROOT/scripts/load/cleanup.sql" ;;
  core) cd "$ROOT/packages/core" && exec node_modules/.bin/tsx "$ROOT/scripts/load/bench-core.ts" "$@" ;;
  http) exec node "$ROOT/scripts/load/bench-http.mjs" "$@" ;;
  *) sed -n '2,7p' "$0"; exit 1 ;;
esac

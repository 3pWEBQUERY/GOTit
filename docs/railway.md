# Betrieb auf Railway

Alles läuft in einem Railway-Projekt in einer EU-Region (PRD 14.2). Die Konfiguration der Dienste liegt als Code im Repo; Geheimnisse liegen ausschliesslich als Railway-Variablen vor, pro Umgebung getrennt.

## Dienste

| Dienst | Config-Datei (absoluter Pfad im Repo) | Öffentlich | Healthcheck |
| --- | --- | --- | --- |
| `web` | `/apps/web/railway.json` | Ja | `/api/health` (prüft die Datenbank) |
| `realtime` | `/apps/realtime/railway.json` | Ja, eigene Subdomain | `/health` |
| `worker` | `/apps/worker/railway.json` | Nein | – |
| `cron` | `/apps/cron/railway.json` | Nein | – |
| Postgres, Redis | Railway-Vorlagen | Nein, nur privates Netz | – |

Das Repo ist ein geteiltes Monorepo: Das Root Directory jedes Dienstes bleibt `/`, und in den Dienst-Einstellungen wird der Pfad der Config-Datei gesetzt. Railway folgt dem Root Directory dabei nicht; der Pfad muss absolut sein.

`cron` bekommt pro Aufgabe einen eigenen Railway-Dienst mit Cron-Zeitplan und dem Startbefehl `pnpm --filter @app/cron start <aufgabe>`. Solange `apps/cron/src/tasks.ts` leer ist, wird kein solcher Dienst angelegt.

## Variablen

| Variable | Dienste | Quelle |
| --- | --- | --- |
| `DATABASE_URL` | web, worker, cron | Referenz `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | web, realtime, worker | Referenz `${{Redis.REDIS_URL}}` |
| `BETTER_AUTH_SECRET` | web, realtime | pro Umgebung erzeugt, mindestens 32 Zeichen |
| `AGE_GATE_SECRET` | web | pro Umgebung erzeugt, mindestens 32 Zeichen |
| `APP_URL`, `APP_NAME` | web | pro Umgebung |

Migrationen laufen als Pre-Deploy-Schritt von `web`, zusammen mit den Referenzdaten (Regionen, Flags). Fiktive Testkonten werden in der Produktion nie geladen; `seed/run.ts` bricht dort ab.

## Stand

Die Konfiguration ist geschrieben und lokal gebaut. Ein Railway-Projekt für diese Plattform ist noch **nicht** angelegt: Das kostet Geld und setzt laut PRD 16.3 die schriftliche Bestätigung von Railway zur Acceptable Use Policy voraus. Beides entscheidet Alexander.

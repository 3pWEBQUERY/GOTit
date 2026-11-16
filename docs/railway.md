# Betrieb auf Railway

Projekt **GOTit** im Workspace «3pwebquery's Projects», Umgebung `production`, alles in der EU (PRD 14.2): Dienste und Volumes in `europe-west4` (Amsterdam), Buckets in `ams`.

| | URL |
| --- | --- |
| web | https://web-production-fe2fa516.up.railway.app |
| realtime | wss://realtime-production-b88d47b7.up.railway.app |

## Dienste

| Dienst | Quelle | Build | Start | Healthcheck | Öffentlich |
| --- | --- | --- | --- | --- | --- |
| `web` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/web` | `pnpm --filter @app/web start` | `/api/health` (prüft die Datenbank) | Ja |
| `realtime` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/realtime` | `pnpm --filter @app/realtime start` | `/health` | Ja |
| `worker` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/worker` | `pnpm --filter @app/worker start` | – | Nein |
| `cron-purge-expired` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/cron` | `pnpm --filter @app/cron start purge-expired`, täglich 03:17 UTC | – | Nein |
| `Postgres` | Vorlage (Postgres 18) | – | – | – | Nein |
| `Redis` | Vorlage (Redis 8) | – | – | – | Nein |
| Bucket `originals` | – | – | – | – | privat |
| Bucket `derivatives` | – | – | – | – | privat |

- Root Directory aller Dienste ist `/` (geteiltes Monorepo). Builder ist Railpack; es liest Node-Version (`.nvmrc`) und pnpm-Version (`packageManager`).
- **Pre-Deploy von `web`:** `pnpm release` führt die Migrationen aus und lädt die Referenzdaten (Regionen, Flags). Fiktive Testkonten werden dort nie geladen.
- **Watch-Pfade:** Jeder Dienst baut nur bei Änderungen an seinem Ordner und den Paketen, die er nutzt.
- **Neustart:** bei Fehler, höchstens 5 Versuche.
- **`cron`:** Ein Dienst pro Aufgabe aus `apps/cron/src/tasks.ts`, mit Zeitplan und Start `pnpm --filter @app/cron start <aufgabe>`; er erledigt die Aufgabe und beendet sich (Neustart: nie). Bisher: `purge-expired` setzt die Aufbewahrungsfristen durch und löscht Konten nach Ablauf der 30-Tage-Frist.

## Variablen

Geteilt (Umgebung `production`): `BETTER_AUTH_SECRET`, `AGE_GATE_SECRET`, `APP_NAME`. Dienste referenzieren sie mit `${{shared.NAME}}`.

| Variable | Dienste | Wert |
| --- | --- | --- |
| `DATABASE_URL` | web, worker, cron-purge-expired | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | web, realtime, worker | `${{Redis.REDIS_URL}}` |
| `BETTER_AUTH_SECRET` | web, realtime | `${{shared.BETTER_AUTH_SECRET}}` |
| `AGE_GATE_SECRET` | web | `${{shared.AGE_GATE_SECRET}}` |
| `APP_URL` | web | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `REALTIME_URL` | web | `wss://${{realtime.RAILWAY_PUBLIC_DOMAIN}}` |

`NODE_ENV` wird bewusst nicht gesetzt: Mit `production` liesse `pnpm install` beim Build die Entwicklungsabhängigkeiten weg (Next.js-Build, Prisma-CLI, Turbo). `next start` setzt den Produktionsmodus selbst. Eine geteilte `NODE_ENV` liegt noch in der Umgebung, wird aber von keinem Dienst referenziert und wirkt daher nicht; sie lässt sich im Dashboard unter «Shared Variables» löschen.

## Konfiguration als Code

Die PRD verlangt `railway.json` pro Dienst. Railway nimmt für neu angelegte Dienste keine Config-Datei mehr an; der Nachfolger ist Infrastructure as Code (`.railway/railway.ts`, angewendet mit der Railway-CLI). Bis das eingerichtet ist, gilt diese Datei als Beschreibung der Soll-Konfiguration, und die Werte sind direkt an den Diensten gesetzt (siehe `docs/decisions/0007-railway-konfiguration.md`).

## E-Mail-Versand

Nicht eingerichtet: Gate 16.3 der PRD (Anbieter, der die Branche zulässt) ist offen. Solange `MAIL_TRANSPORT` fehlt, ist die Registrierung geschlossen und sagt das; der Worker lehnt E-Mail-Jobs sichtbar ab. Nach der Wahl des Anbieters an `web` und `worker` setzen: `MAIL_TRANSPORT=smtp`, `SMTP_URL` (als Geheimnis), `MAIL_FROM`.

## Noch nicht eingerichtet

- Umgebung `staging` und PR-Umgebungen (PRD 14.2).
- Tägliche Backups von Postgres mit getestetem Restore und verschlüsseltem Dump in einen dritten Bucket (PRD 14.2): kommt mit dem `cron`-Dienst in Schritt 1.14.
- Bucket-Zugangsdaten für `web` und `worker`: kommen mit der Medien-Pipeline in Schritt 1.6.

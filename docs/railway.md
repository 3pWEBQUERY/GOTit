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
| `cron-rebuild-search-index` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/cron` | `pnpm --filter @app/cron start rebuild-search-index`, täglich 02:47 UTC | – | Nein |
| `Postgres` | Vorlage (Postgres 18) | – | – | – | Nein |
| `Redis` | Vorlage (Redis 8) | – | – | – | Nein |
| Bucket `originals` | – | – | – | – | privat |
| Bucket `derivatives` | – | – | – | – | privat |

- Root Directory aller Dienste ist `/` (geteiltes Monorepo). Builder ist Railpack; es liest Node-Version (`.nvmrc`) und pnpm-Version (`packageManager`).
- **Pre-Deploy von `web`:** `pnpm release` führt die Migrationen aus und lädt die Referenzdaten (Regionen, Flags). Fiktive Testkonten werden dort nie geladen.
- **Watch-Pfade:** Jeder Dienst baut nur bei Änderungen an seinem Ordner und den Paketen, die er nutzt.
- **Neustart:** bei Fehler, höchstens 5 Versuche.
- **`cron`:** Ein Dienst pro Aufgabe aus `apps/cron/src/tasks.ts`, mit Zeitplan und Start `pnpm --filter @app/cron start <aufgabe>`; er erledigt die Aufgabe und beendet sich (Neustart: nie). Bisher: `purge-expired` setzt die Aufbewahrungsfristen durch und löscht Konten nach Ablauf der 30-Tage-Frist; `rebuild-search-index` baut den Suchindex neu auf (Entscheid 0013).

## Variablen

Geteilt (Umgebung `production`): `BETTER_AUTH_SECRET`, `AGE_GATE_SECRET`, `APP_NAME`, `APP_ENV=production`. Dienste referenzieren sie mit `${{shared.NAME}}`.

| Variable | Dienste | Wert |
| --- | --- | --- |
| `DATABASE_URL` | web, worker, cron-purge-expired, cron-rebuild-search-index | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | web, realtime, worker | `${{Redis.REDIS_URL}}` |
| `BETTER_AUTH_SECRET` | web, realtime | `${{shared.BETTER_AUTH_SECRET}}` |
| `AGE_GATE_SECRET` | web | `${{shared.AGE_GATE_SECRET}}` |
| `APP_URL` | web | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `APP_ENV` | web, worker | `${{shared.APP_ENV}}`; verbietet den E-Mail-Ausgang und fiktive Testkonten |
| `REALTIME_URL` | web | `wss://${{realtime.RAILWAY_PUBLIC_DOMAIN}}` |

`NODE_ENV` wird bewusst nicht gesetzt: Mit `production` liesse `pnpm install` beim Build die Entwicklungsabhängigkeiten weg (Next.js-Build, Prisma-CLI, Turbo). `next start` setzt den Produktionsmodus selbst. Eine geteilte `NODE_ENV` liegt noch in der Umgebung, wird aber von keinem Dienst referenziert und wirkt daher nicht; sie lässt sich im Dashboard unter «Shared Variables» löschen.

## Konfiguration als Code

Die PRD verlangt `railway.json` pro Dienst. Railway nimmt für neu angelegte Dienste keine Config-Datei mehr an; der Nachfolger ist Infrastructure as Code (`.railway/railway.ts`, angewendet mit der Railway-CLI). Bis das eingerichtet ist, gilt diese Datei als Beschreibung der Soll-Konfiguration, und die Werte sind direkt an den Diensten gesetzt (siehe `docs/decisions/0007-railway-konfiguration.md`).

## E-Mail-Versand

Anbieter: **Resend** (Entscheid vom 17.11.2026), angebunden über die HTTP-API (`MAIL_TRANSPORT=resend`), weil Railway ausgehendes SMTP je nach Tarif sperrt. Noch nicht aktiv. Solange es fehlt, ist die Registrierung geschlossen und sagt das; der Worker lehnt E-Mail-Jobs sichtbar ab. Zum Einschalten:
1. Gate 16.3: bestätigen, dass die Nutzungsbedingungen von Resend den Versand für diese Plattform zulassen (die E-Mails selbst sind neutral: Bestätigung, Passwort, Sicherheitshinweise).
2. Bei Resend eine Absender-Domain verifizieren (DNS-Einträge SPF und DKIM) und einen API-Schlüssel nur mit Senderecht anlegen.
3. An `web` und `worker` setzen: `MAIL_TRANSPORT=resend`, `MAIL_FROM` (zum Beispiel `Name <hallo@domain>`), `RESEND_API_KEY` als versiegelte Variable im Dashboard, nie im Repo oder Chat.

## Noch nicht eingerichtet

- **Umgebung `staging`** (PRD 14.2). Railway erlaubt das Anlegen von Umgebungen nur im Dashboard oder mit der CLI:
  1. Im Projekt GOTit oben die Umgebung `production` duplizieren und `staging` nennen; die gestagten Änderungen prüfen und anwenden.
  2. In `staging` für `web` und `realtime` je eine Domain erzeugen.
  3. In `staging` neue Werte für `BETTER_AUTH_SECRET` und `AGE_GATE_SECRET` setzen (die Duplizierung kopiert die Werte aus Produktion; Geheimnisse sind pro Umgebung getrennt).
  4. Bei Bedarf in `staging` `MAIL_TRANSPORT=outbox` setzen, damit sich die Registrierung ohne echten Versand testen lässt.
  5. `APP_ENV=staging` als gemeinsame Variable setzen; die Duplizierung übernimmt sonst `production`.
  6. Den kopierten Dienst `staging` in der neuen Umgebung löschen. Er war eine Kopie von `web` in `production` mit der Produktionsdatenbank und wird auch dort gelöscht.
- **PR-Umgebungen:** in den Projekteinstellungen einschalten, sobald Pull Requests genutzt werden.
- Tägliche Backups von Postgres mit getestetem Restore und verschlüsseltem Dump in einen dritten Bucket (PRD 14.2): kommt mit dem `cron`-Dienst in Schritt 1.14.
- Bucket-Zugangsdaten für `web` und `worker`: kommen mit der Medien-Pipeline in Schritt 1.6.

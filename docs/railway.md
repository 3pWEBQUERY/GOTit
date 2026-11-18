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
| `cron-booking-maintenance` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/cron` | `pnpm --filter @app/cron start booking-maintenance`, stündlich zur Minute 7 | – | Nein |
| `cron-lift-expired-restrictions` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/cron` | `pnpm --filter @app/cron start lift-expired-restrictions`, stündlich zur Minute 17 | – | Nein |
| `cron-aggregate-stats` | GitHub `3pWEBQUERY/GOTit` | `pnpm turbo run build --filter=@app/cron` | `pnpm --filter @app/cron start aggregate-stats`, täglich 01:23 UTC | – | Nein |
| `cron-backup-database` | GitHub `3pWEBQUERY/GOTit` | Dockerfile `apps/cron/backup.Dockerfile` (`RAILWAY_DOCKERFILE_PATH`), wegen `pg_dump` 18 und `age` | `node apps/cron/dist/index.js backup-database` (CMD des Images), täglich 02:13 UTC | – | Nein |
| `Postgres` | Vorlage (Postgres 18) | – | – | – | Nein |
| `Redis` | Vorlage (Redis 8) | – | – | – | Nein |
| Bucket `originals` | – | – | – | – | privat |
| Bucket `derivatives` | – | – | – | – | privat |
| Bucket `backups` | – | – | – | – | privat; nur `cron-backup-database` hat Zugangsdaten |

- Root Directory aller Dienste ist `/` (geteiltes Monorepo). Builder ist Railpack; es liest Node-Version (`.nvmrc`) und pnpm-Version (`packageManager`).
- **Pre-Deploy von `web`:** `pnpm release` führt die Migrationen aus und lädt die Referenzdaten (Regionen, Flags). Fiktive Testkonten werden dort nie geladen. Nur mit `SEED_DEMO=1` lädt er danach die Demo-Daten (Entscheid 0023); in der Produktion braucht es zusätzlich `DEMO_ALLOW_PRODUCTION=1`.
- **Watch-Pfade:** Jeder Dienst baut nur bei Änderungen an seinem Ordner und den Paketen, die er nutzt.
- **Neustart:** bei Fehler, höchstens 5 Versuche.
- **`cron`:** Ein Dienst pro Aufgabe aus `apps/cron/src/tasks.ts`, mit Zeitplan und Start `pnpm --filter @app/cron start <aufgabe>`; er erledigt die Aufgabe und beendet sich (Neustart: nie). Bisher: `purge-expired` setzt die Aufbewahrungsfristen durch und löscht Konten nach Ablauf der 30-Tage-Frist; `rebuild-search-index` baut den Suchindex neu auf (Entscheid 0013); `backup-database` sichert die Datenbank verschlüsselt in den Bucket `backups` (Entscheid 0024).
- **`cron-backup-database`:** als einziger Dienst mit Dockerfile statt Railpack, weil Debian kein `postgresql-client-18` hat (Entscheid 0024). Watch-Pfade wie die übrigen Cron-Dienste plus `apps/cron/backup.Dockerfile`.

## Variablen

Geteilt (Umgebung `production`): `BETTER_AUTH_SECRET`, `AGE_GATE_SECRET`, `APP_NAME`, `APP_ENV=production`. Dienste referenzieren sie mit `${{shared.NAME}}`.

| Variable | Dienste | Wert |
| --- | --- | --- |
| `DATABASE_URL` | web, worker, cron-purge-expired, cron-rebuild-search-index | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | web, realtime, worker | `${{Redis.REDIS_URL}}` |
| `BETTER_AUTH_SECRET` | web, realtime | `${{shared.BETTER_AUTH_SECRET}}` |
| `AGE_GATE_SECRET` | web | `${{shared.AGE_GATE_SECRET}}` |
| `APP_URL` | web | `https://thegnd.net` (staging `https://staging.thegnd.net`) |
| `APP_ENV` | web, worker, cron-purge-expired | `${{shared.APP_ENV}}`; verbietet den E-Mail-Ausgang und fiktive Testkonten |
| `REALTIME_URL` | web | `wss://realtime.thegnd.net` (staging `wss://realtime-staging.thegnd.net`) |
| `STORAGE_DRIVER=s3`, `S3_*` | web, worker, cron-purge-expired | Referenzen auf die Buckets (`${{originals.BUCKET}}`, `${{originals.ACCESS_KEY_ID}}`, …); der Cron-Dienst löscht Chat-Bilder abgelaufener Konten (Entscheid 0014) |
| `DATABASE_URL`, `APP_ENV` | cron-backup-database | `${{Postgres.DATABASE_URL}}`, `${{shared.APP_ENV}}` |
| `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION` | cron-backup-database | wie bei den anderen Buckets |
| `S3_BACKUPS_BUCKET`, `S3_BACKUPS_ACCESS_KEY_ID`, `S3_BACKUPS_SECRET_ACCESS_KEY` | nur cron-backup-database | Referenzen auf den Bucket `backups` (`${{backups.BUCKET}}`, …) |
| `BACKUP_AGE_RECIPIENTS` | cron-backup-database | öffentliche age-Schlüssel `age1…`, kommagetrennt (Haupt- und Notfallschlüssel); ohne sie bricht die Sicherung ab. Der private Schlüssel ist nie auf Railway (Entscheid 0024) |
| `RAILWAY_DOCKERFILE_PATH` | cron-backup-database | `apps/cron/backup.Dockerfile` |

`NODE_ENV` wird bewusst nicht gesetzt: Mit `production` liesse `pnpm install` beim Build die Entwicklungsabhängigkeiten weg (Next.js-Build, Prisma-CLI, Turbo). `next start` setzt den Produktionsmodus selbst. Eine geteilte `NODE_ENV` liegt noch in der Umgebung, wird aber von keinem Dienst referenziert und wirkt daher nicht; sie lässt sich im Dashboard unter «Shared Variables» löschen.

## Konfiguration als Code

Die PRD verlangt `railway.json` pro Dienst. Railway nimmt für neu angelegte Dienste keine Config-Datei mehr an; der Nachfolger ist Infrastructure as Code (`.railway/railway.ts`, angewendet mit der Railway-CLI). Bis das eingerichtet ist, gilt diese Datei als Beschreibung der Soll-Konfiguration, und die Werte sind direkt an den Diensten gesetzt (siehe `docs/decisions/0007-railway-konfiguration.md`).

## E-Mail-Versand

Anbieter: **Resend**, angebunden über die HTTP-API, weil Railway ausgehendes SMTP je nach Tarif sperrt. Die Absender-Domain `thegnd.net` ist bei Resend verifiziert (17.11.2026).

| Variable | Dienste (`production`) | Wert |
| --- | --- | --- |
| `MAIL_TRANSPORT` | web, worker | `resend` |
| `MAIL_FROM` | web, worker | `${{shared.APP_NAME}} <noreply@thegnd.net>` |
| `RESEND_API_KEY` | web, worker | im Dashboard gesetzt (17.11.2026); Schlüssel nur mit Senderecht. Empfehlung: im Dashboard versiegeln («Seal»), damit niemand den Wert zurücklesen kann |

Der Versand ist seit dem 17.11.2026 aktiv. Ohne `RESEND_API_KEY` gälte er als nicht eingerichtet: Die Registrierung ist geschlossen und sagt das, der Worker lehnt E-Mail-Jobs sichtbar ab. In `staging` bleibt `MAIL_TRANSPORT=outbox`.

## Domains

| Domain | Dienst | Umgebung |
| --- | --- | --- |
| `thegnd.net`, `www.thegnd.net` | web | production |
| `realtime.thegnd.net` | realtime | production |
| `staging.thegnd.net` | web | staging |
| `realtime-staging.thegnd.net` | realtime | staging |

Seit dem 17.11.2026 sind alle fünf Domains bestätigt, die Zertifikate gültig und `APP_URL` sowie `REALTIME_URL` umgestellt. Better Auth nimmt Anmeldungen nur vom Ursprung aus `APP_URL` an; `www.thegnd.net` und die Railway-Domains leiten deshalb auf `thegnd.net` um (kanonischer Host in `apps/web/proxy.ts`).

## Noch nicht eingerichtet

- **Umgebung `staging`** (PRD 14.2), angelegt am 17.11.2026 als Kopie von `production`:
  - **Eigene Daten:** eigene Postgres- und Redis-Instanzen und eigene Buckets (`originals-…`, `derivatives-…`). Alle Verbindungen sind Referenzen und zeigen auf die Dienste von Staging; die erste Bereitstellung hat alle Migrationen auf eine leere Datenbank angewendet.
  - **Domains:** `web-staging-8db1eddb.up.railway.app`, `realtime-staging-c7b8e78a.up.railway.app`.
  - **Variablen nur in Staging:**
    - `APP_ENV=staging` (geteilt),
    - `MAIL_TRANSPORT=outbox` an `web` und `worker`: E-Mails landen in der Tabelle `email_outbox`,
    - `IDENTITY_PROVIDER=test` an `web`: Die Identitätsprüfung lässt sich mit `/dev/verifizierung/[ref]` durchspielen.

    Beides ist in `production` gesperrt.
  - **Geheimnisse:** `BETTER_AUTH_SECRET` und `AGE_GATE_SECRET` haben in Staging eigene Werte (17.11.2026); eine Sitzung aus Staging gilt nie in der Produktion.
  - **Cron-Dienste:**
    - Bis zum 18.11.2026 gab es in Staging nur `cron-purge-expired` und `cron-rebuild-search-index`; die Übergaben 1.9 und 1.12 nannten Staging zu Unrecht.
    - Seit dem 18.11.2026 laufen dort zusätzlich `cron-booking-maintenance-0uq2`, `cron-aggregate-stats-CsX7` und `cron-lift-expired-restrictions-zyoF`.
    - Das sind eigene Dienste nur in Staging: Railway legt eine bestehende Produktionsinstanz nicht nachträglich in einer zweiten Umgebung an und hängt an den Namen eine Endung an.
    - Befehl, Zeitplan und Variablen sind dieselben wie in der Produktion, die Referenzen zeigen auf Postgres, Redis und `web` von Staging.
  - **Demo-Daten** (Entscheid 0023), eingeschaltet am 18.11.2026 in `staging` und `production`:
    - Einschalten: `SEED_DEMO=1` am Dienst `web` in `staging`, optional `DEMO_PASSWORD` (mindestens 12 Zeichen) für die Logins `demo-mitglied@demo.invalid`, `demo-anbieter@demo.invalid` und `demo-club@demo.invalid`. Danach `web` neu bereitstellen; `pnpm release` lädt die Daten nach den Referenzdaten.
    - Bilder: `DEMO_MEDIA_BUDGET_SECONDS=1200` und eine Pre-Deploy-Frist von 1800 Sekunden am Dienst `web`, damit der erste Lauf alle etwa 98 Bilder erzeugt (rund 10 Minuten); spätere Läufe dauern etwa 20 Sekunden. Scheitert das Laden, scheitert die Bereitstellung (gewollt).
    - Ausschalten: `SEED_DEMO` entfernen. Entfernen der Daten: `pnpm --filter @app/demo seed --reset-only` mit der Umgebung von Staging.
    - In `production` zusätzlich `DEMO_ALLOW_PRODUCTION=1`; dort gibt es nie Logins. **Vor dem öffentlichen Start** beide Variablen entfernen und die Daten mit `--reset-only` löschen.
- **PR-Umgebungen:** in den Projekteinstellungen einschalten, sobald Pull Requests genutzt werden.
- **Backups von Postgres** (PRD 14.2, Entscheid 0024), Code fertig, auf Railway noch einzurichten:
  - Erste Schicht: am Dienst `Postgres` unter «Backups» den Zeitplan täglich, wöchentlich und monatlich einschalten (Railway hält sie 6, 27 und 89 Tage; mit dem Volume gehen auch sie verloren).
  - Zweite Schicht: Bucket `backups` anlegen (`ams`), Dienst `cron-backup-database` mit den Variablen oben, in `production` und `staging` (in Staging mit eigenem Bucket).
  - Schlüsselpaar offline erzeugen, nur die öffentlichen Schlüssel in `BACKUP_AGE_RECIPIENTS`.
  - Erster Lauf von Hand («Run now»), danach die Restore-Probe auf Staging nach Entscheid 0024.
- Bucket-Zugangsdaten für `web` und `worker`: kommen mit der Medien-Pipeline in Schritt 1.6.

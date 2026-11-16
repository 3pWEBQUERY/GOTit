# GOTit (Arbeitsname)

Premium-Marktplatz mit Community und Business-Suite für den Schweizer Markt. Verbindliche Spezifikation ist die PRD v2.0; Entscheide stehen in `docs/decisions/`, der Stand je Schritt in `docs/handover/`.

## Aufbau

```text
apps/web        Next.js 16: Marktplatz, Community, Mitgliederbereich, Studio, Admin
apps/realtime   WebSocket-Dienst
apps/worker     BullMQ-Worker
apps/cron       geplante Aufgaben
packages/ui     Designsystem: Tokens, Komponenten, Glas
packages/core   Domänenlogik ohne Framework, ein Ordner pro Modul
packages/db     Prisma-Schema (eine Datei pro Modul), Migrationen, Seed
packages/auth   Better Auth, Sitzungs-Helfer
packages/jobs   Queue-Definitionen, Redis-Verbindung
packages/config ESLint, tsconfig, Dateigrössen-Prüfung
```

## Lokal starten

Voraussetzung: Node 22, pnpm 10, Postgres 16 (mit `pg_trgm`) und Redis.

```bash
cp .env.example .env
```

In `.env` `BETTER_AUTH_SECRET` und `AGE_GATE_SECRET` mit je mindestens 32 zufälligen Zeichen füllen, dann:

```bash
pnpm install
```

```bash
pnpm db:migrate
```

```bash
pnpm --filter @app/db seed:fixtures
```

```bash
pnpm dev
```

`seed:fixtures` lädt zusätzlich fiktive Testkonten (`mitglied@fiktiv.test`, `anbieter@fiktiv.test`, `entwurf@fiktiv.test`, `club@fiktiv.test`); das Passwort steht in `packages/db/seed/fixtures/test-accounts.ts`. In der Produktion verweigert der Seed diese Konten.

## Prüfen

```bash
pnpm check:file-size
```

```bash
pnpm lint && pnpm typecheck && pnpm test
```

```bash
pnpm test:e2e
```

Die Testseiten des Designsystems liegen unter `/de/dev/ui` (nur ausserhalb der Produktion).

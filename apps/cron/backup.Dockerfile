# Image nur für den Dienst cron-backup-database (Entscheid 0024).
# Railway Postgres läuft mit Version 18; pg_dump muss mindestens so neu sein.
# Debian liefert postgresql-client-18 nicht (bookworm: 15, trixie: 17), deshalb
# kommt es aus dem Apt-Repository des PostgreSQL-Projekts (PGDG). age stammt aus Debian.
# Railway: Variable RAILWAY_DOCKERFILE_PATH=apps/cron/backup.Dockerfile am Dienst.
FROM node:22-trixie-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates postgresql-common age \
  && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
  && apt-get install -y --no-install-recommends postgresql-client-18 \
  && rm -rf /var/lib/apt/lists/* \
  && pg_dump --version && age --version

WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter "@app/cron..." \
  && pnpm turbo run build --filter=@app/cron

# Kein Healthcheck, kein Port: Railway startet den Dienst nach Zeitplan, er sichert und beendet sich.
CMD ["node", "apps/cron/dist/index.js", "backup-database"]

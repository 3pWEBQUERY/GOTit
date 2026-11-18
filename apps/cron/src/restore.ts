/**
 * Restore einer Datenbank-Sicherung (Entscheid 0024), von Hand auf dem
 * Rechner der Betreiberin, nie auf Railway:
 *
 *   pnpm --filter @app/cron restore -- --key postgres/2026/11/18/20261118T021305Z.dump.age \
 *     --identity ~/gotit-backup.key --target-url postgresql://…/restore_drill
 *
 * Ohne `--key` liest er eine lokale Datei: `--file <dump.age> --manifest <manifest.json>`.
 * Der Bucket kommt aus `STORAGE_DRIVER=s3` und `S3_ENDPOINT`, `S3_BACKUPS_*`.
 */
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { backupWorkDir, resolveBackupStoreConfig } from "./backup/config";
import { latestRepoMigration, runRestore, type RestoreSource } from "./backup/restore";
import { createBackupStore } from "./backup/store";

const argv = process.argv.slice(2);
// `pnpm … restore -- --key …` reicht das `--` mit durch.
if (argv[0] === "--") argv.shift();

const { values } = parseArgs({
  args: argv,
  options: {
    key: { type: "string" },
    file: { type: "string" },
    manifest: { type: "string" },
    identity: { type: "string" },
    "target-url": { type: "string" },
    "i-know": { type: "boolean", default: false },
    overwrite: { type: "boolean", default: false },
    "skip-prisma": { type: "boolean", default: false },
  },
  strict: true,
});

function fail(message: string): never {
  process.stderr.write(`Fehler: ${message}\n`);
  process.exit(2);
}

const identityPath = values.identity ?? fail("--identity <Datei mit dem privaten age-Schlüssel> fehlt.");
const targetUrl = values["target-url"] ?? fail("--target-url <postgresql://…> fehlt.");
let source: RestoreSource;
if (values.key) source = { kind: "store", store: createBackupStore(resolveBackupStoreConfig()), key: values.key };
else if (values.file && values.manifest) source = { kind: "file", dumpPath: values.file, manifestPath: values.manifest };
else fail("--key <objekt> oder --file <dump.age> mit --manifest <manifest.json> angeben.");

const protectedUrls = [process.env.DATABASE_URL ?? "", ...(process.env.PROTECTED_DATABASE_URLS ?? "").split(",")].map((url) => url.trim()).filter(Boolean);
const migrationsDir = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

try {
  const report = await runRestore({
    source,
    identityPath,
    targetUrl,
    protectedUrls,
    iKnow: values["i-know"],
    overwrite: values.overwrite,
    workDir: backupWorkDir(),
    prismaStatus: values["skip-prisma"]
      ? null
      : { command: "pnpm", args: ["--filter", "@app/db", "exec", "prisma", "migrate", "status"], repoLatestMigration: await latestRepoMigration(migrationsDir) },
    log: (line) => process.stdout.write(`${line}\n`),
  });
  process.stdout.write(`\nSicherung vom ${report.manifest.createdAt}, Server ${report.manifest.server.serverVersion}, Migration ${report.manifest.migrations.latest ?? "keine"}\n`);
  for (const check of report.checks) process.stdout.write(`${check.ok ? (check.warning ? "HINWEIS" : "OK     ") : "FEHLER "} ${check.name}: ${check.detail}\n`);
  process.stdout.write(report.ok ? "\nRestore geprüft.\n" : "\nRestore fertig, aber Prüfungen fehlgeschlagen.\n");
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

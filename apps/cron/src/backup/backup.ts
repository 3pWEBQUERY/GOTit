import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Logger } from "@app/core/observability";
import { libpqConnection } from "./config";
import { connect, firstRow, inspectDatabase, majorOf, toolMajor, waitFor, type DatabaseInventory } from "./postgres";
import { BACKUP_PREFIX, DEFAULT_POLICY, dumpKey, manifestKey, planRetention, type RetentionPolicy } from "./retention";
import type { BackupStore } from "./store";

export const MANIFEST_FORMAT = "gotit-postgres-backup/1";

/** Liegt neben jedem Dump; der Restore prüft Prüfsumme, Migrationen und Zeilen dagegen. */
export interface BackupManifest {
  format: typeof MANIFEST_FORMAT;
  key: string;
  createdAt: string;
  durationMs: number;
  /** Grösse und SHA-256 der verschlüsselten Datei, so wie sie im Bucket liegt. */
  sizeBytes: number;
  sha256: string;
  encryption: { tool: "age"; recipients: string[] };
  pgDump: { version: string; major: number; format: "custom" };
  server: Pick<DatabaseInventory, "serverVersion" | "serverVersionNum" | "database" | "systemIdentifier">;
  migrations: DatabaseInventory["migrations"];
  tables: Record<string, number>;
}

export interface BackupOptions {
  databaseUrl: string;
  recipients: readonly string[];
  store: BackupStore;
  workDir: string;
  logger?: Logger;
  now?: () => Date;
  policy?: RetentionPolicy;
  /** Befehle, überschreibbar für Tests. */
  pgDump?: string;
  age?: string;
}

export interface BackupResult {
  key: string;
  manifest: BackupManifest;
  removed: string[];
}

/** Zählt Bytes und bildet SHA-256 im Durchfluss. */
function digestStream() {
  const hash = createHash("sha256");
  let size = 0;
  const stream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      size += chunk.length;
      callback(null, chunk);
    },
  });
  return { stream, result: () => ({ sha256: hash.digest("hex"), size }) };
}

/**
 * `pg_dump` → `age` → Datei, ohne den Dump im Speicher zu halten. Bestand und
 * Dump teilen sich einen exportierten Snapshot: Die Zeilenzahlen im Manifest
 * gehören genau zu diesem Dump, auch wenn währenddessen geschrieben wird.
 */
async function dumpEncrypted(options: BackupOptions, file: string) {
  const pgDump = options.pgDump ?? "pg_dump";
  const age = options.age ?? "age";
  if (options.recipients.length === 0) throw new Error("Keine age-Empfänger; unverschlüsselt wird nichts gesichert.");
  const tool = await toolMajor(pgDump);

  const client = await connect(options.databaseUrl);
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = firstRow(await client.query<{ id: string }>("SELECT pg_export_snapshot() AS id")).id;
    const inventory = await inspectDatabase(client);
    const serverMajor = majorOf(inventory.serverVersionNum);
    if (tool.major < serverMajor) throw new Error(`${pgDump} ${tool.major} ist älter als der Server (${serverMajor}); es braucht pg_dump ≥ ${serverMajor} (Entscheid 0024).`);

    const connection = libpqConnection(options.databaseUrl);
    const env = { ...process.env, ...connection.env };
    const dump = spawn(pgDump, ["--format=custom", `--snapshot=${snapshot}`, "--no-password", `--dbname=${connection.dbname}`], { env, stdio: ["ignore", "pipe", "pipe"] });
    const encrypt = spawn(age, ["--encrypt", ...options.recipients.flatMap((recipient) => ["--recipient", recipient])], { stdio: ["pipe", "pipe", "pipe"] });
    const digest = digestStream();
    const steps = [
      waitFor(dump, "pg_dump"),
      waitFor(encrypt, "age"),
      pipeline(dump.stdout, encrypt.stdin),
      pipeline(encrypt.stdout, digest.stream, createWriteStream(file, { mode: 0o600 })),
    ];
    try {
      await Promise.all(steps);
    } catch (error) {
      dump.kill("SIGTERM");
      encrypt.kill("SIGTERM");
      await Promise.allSettled(steps);
      throw error;
    }
    await client.query("COMMIT");
    return { inventory, tool, ...digest.result() };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Sichert die Datenbank verschlüsselt in den Bucket `backups` und räumt nach
 * der Aufbewahrungsregel auf. Das Manifest wird zuletzt hochgeladen: Ein Dump
 * ohne Manifest gilt als unvollständig.
 */
export async function runBackup(options: BackupOptions): Promise<BackupResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const key = dumpKey(startedAt);
  const dir = await mkdtemp(join(options.workDir, "gotit-backup-"));
  const file = join(dir, "dump.age");
  try {
    const { inventory, tool, sha256, size } = await dumpEncrypted(options, file);
    const { size: onDisk } = await stat(file);
    if (onDisk !== size || size === 0) throw new Error("Die verschlüsselte Datei ist leer oder unvollständig.");

    const manifest: BackupManifest = {
      format: MANIFEST_FORMAT,
      key,
      createdAt: startedAt.toISOString(),
      durationMs: now().getTime() - startedAt.getTime(),
      sizeBytes: size,
      sha256,
      encryption: { tool: "age", recipients: [...options.recipients] },
      pgDump: { version: tool.version, major: tool.major, format: "custom" },
      server: { serverVersion: inventory.serverVersion, serverVersionNum: inventory.serverVersionNum, database: inventory.database, systemIdentifier: inventory.systemIdentifier },
      migrations: inventory.migrations,
      tables: inventory.tables,
    };
    await options.store.putFile(key, file, "application/octet-stream");
    await options.store.putText(manifestKey(startedAt), `${JSON.stringify(manifest, null, 2)}\n`, "application/json");
    options.logger?.info("backup_uploaded", { key, bytes: size, tables: Object.keys(inventory.tables).length, migration: inventory.migrations.latest ?? "none" });

    const plan = planRetention(await options.store.list(BACKUP_PREFIX), now(), options.policy ?? DEFAULT_POLICY);
    if (plan.keep.includes(key)) await options.store.delete(plan.remove);
    else throw new Error("Aufbewahrung würde die neue Sicherung löschen; Aufräumen abgebrochen.");
    options.logger?.info("backup_retention", { kept: plan.keep.length, removed: plan.remove.length });
    return { key, manifest, removed: plan.remove };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

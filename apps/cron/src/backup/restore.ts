import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { MANIFEST_FORMAT, type BackupManifest } from "./backup";
import { databaseIdentity, libpqConnection } from "./config";
import { capture, connect, firstRow, inspectDatabase, invalidIndexCount, toolMajor, waitFor } from "./postgres";
import { manifestKeyFor } from "./retention";
import type { BackupStore } from "./store";

export interface RestoreCheck {
  name: string;
  ok: boolean;
  /** Nur ein Hinweis, kein Fehler (z. B. Sicherung älter als der Code). */
  warning?: boolean;
  detail: string;
}

export type RestoreSource = { kind: "store"; store: BackupStore; key: string } | { kind: "file"; dumpPath: string; manifestPath: string };

export interface RestoreOptions {
  source: RestoreSource;
  /** Datei mit dem privaten age-Schlüssel (`AGE-SECRET-KEY-1…`). */
  identityPath: string;
  targetUrl: string;
  /** Datenbanken, in die nur mit `iKnow` zurückgespielt wird (Produktion). */
  protectedUrls: readonly string[];
  iKnow?: boolean;
  /** Erlaubt eine Ziel-Datenbank mit bestehenden Tabellen; `pg_restore --clean` ersetzt sie. */
  overwrite?: boolean;
  workDir: string;
  /** `prisma migrate status` gegen das Ziel; null überspringt. */
  prismaStatus?: { command: string; args: string[]; repoLatestMigration?: string | null } | null;
  age?: string;
  pgRestore?: string;
  log?: (line: string) => void;
}

export interface RestoreReport {
  ok: boolean;
  manifest: BackupManifest;
  checks: RestoreCheck[];
}

/**
 * Schützt die Produktion: Ein Ziel aus `protectedUrls` (gleicher Host, Port
 * und Datenbank) braucht `--i-know`. Rein, damit es sich testen lässt.
 */
export function assertTargetAllowed(targetUrl: string, protectedUrls: readonly string[], iKnow = false): void {
  const target = databaseIdentity(targetUrl);
  const hit = protectedUrls.map((url) => url.trim()).filter(Boolean).some((url) => databaseIdentity(url) === target);
  if (hit && !iKnow) throw new Error(`Ziel ${target} ist geschützt (DATABASE_URL oder PROTECTED_DATABASE_URLS). Nur mit --i-know zurückspielen.`);
}

/** Prüft die Form des Manifests, bevor ihm etwas geglaubt wird. */
export function parseManifest(text: string): BackupManifest {
  const value = JSON.parse(text) as Partial<BackupManifest>;
  if (value.format !== MANIFEST_FORMAT) throw new Error(`Unbekanntes Manifest-Format «${String(value.format)}».`);
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sha256)) throw new Error("Manifest ohne gültige SHA-256.");
  if (typeof value.sizeBytes !== "number" || !value.tables || !value.migrations || !value.server || !value.pgDump) throw new Error("Manifest unvollständig.");
  return value as BackupManifest;
}

async function fileDigest(path: string): Promise<{ sha256: string; size: number }> {
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(path) as AsyncIterable<Buffer>) {
    hash.update(chunk);
    size += chunk.length;
  }
  return { sha256: hash.digest("hex"), size };
}

/** Name der neuesten Migration im Repo (`packages/db/migrations`); null, wenn der Ordner fehlt. */
export async function latestRepoMigration(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return names.at(-1) ?? null;
}

/** Vergleicht Zeilenzahlen; liefert die Abweichungen als lesbare Liste. */
export function compareTables(expected: Record<string, number>, actual: Record<string, number>): string[] {
  const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return names.filter((name) => expected[name] !== actual[name]).map((name) => `${name}: erwartet ${expected[name] ?? "fehlt"}, gefunden ${actual[name] ?? "fehlt"}`);
}

async function readManifest(store: BackupStore, key: string): Promise<string> {
  const text = await store.getText(manifestKeyFor(key));
  if (text === null) throw new Error(`Kein Manifest zu «${key}»; die Sicherung ist unvollständig.`);
  return text;
}

/** Vor dem Download: nie in die Quelle selbst, nie über bestehende Tabellen ohne `overwrite`. */
async function assertTargetReady(options: RestoreOptions, manifest: BackupManifest): Promise<void> {
  const target = await connect(options.targetUrl);
  try {
    const before = await inspectDatabase(target);
    const sameCluster = manifest.server.systemIdentifier !== null && before.systemIdentifier === manifest.server.systemIdentifier;
    if (sameCluster && before.database === manifest.server.database && !options.iKnow) {
      throw new Error("Das Ziel ist die Datenbank, aus der die Sicherung stammt. Nur mit --i-know zurückspielen.");
    }
    const existing = Object.keys(before.tables).length;
    if (existing > 0 && !options.overwrite) throw new Error(`Das Ziel enthält ${existing} Tabellen. Mit --overwrite ersetzt pg_restore --clean sie.`);
  } finally {
    await target.end().catch(() => undefined);
  }
}

/**
 * Lädt eine Sicherung, prüft die Prüfsumme, entschlüsselt sie mit dem
 * privaten Schlüssel und spielt sie mit `pg_restore` ins Ziel. Danach prüft
 * er Zeilen, Migrationen und Indizes gegen das Manifest.
 */
export async function runRestore(options: RestoreOptions): Promise<RestoreReport> {
  const log = options.log ?? (() => undefined);
  const age = options.age ?? "age";
  const pgRestore = options.pgRestore ?? "pg_restore";
  assertTargetAllowed(options.targetUrl, options.protectedUrls, options.iKnow);

  const dir = await mkdtemp(join(options.workDir, "gotit-restore-"));
  const file = join(dir, "dump.age");
  try {
    const source = options.source;
    const manifest = parseManifest(source.kind === "store" ? await readManifest(source.store, source.key) : await readFile(source.manifestPath, "utf8"));

    const restoreTool = await toolMajor(pgRestore);
    if (restoreTool.major < manifest.pgDump.major) throw new Error(`${pgRestore} ${restoreTool.major} ist älter als das pg_dump der Sicherung (${manifest.pgDump.major}).`);
    await assertTargetReady(options, manifest);

    if (source.kind === "store") {
      log(`Lade ${source.key} (${manifest.sizeBytes} Bytes) …`);
      await source.store.getFile(source.key, file);
    } else {
      await copyFile(source.dumpPath, file);
    }
    const digest = await fileDigest(file);
    if (digest.sha256 !== manifest.sha256 || digest.size !== manifest.sizeBytes) {
      throw new Error(`Prüfsumme stimmt nicht: Manifest ${manifest.sha256} (${manifest.sizeBytes} B), Datei ${digest.sha256} (${digest.size} B). Nichts zurückgespielt.`);
    }
    log("Prüfsumme stimmt.");

    log("Entschlüssle und spiele zurück …");
    const connection = libpqConnection(options.targetUrl);
    const decrypt = spawn(age, ["--decrypt", "--identity", options.identityPath, file], { stdio: ["ignore", "pipe", "pipe"] });
    const restore = spawn(pgRestore, ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction", "--no-password", `--dbname=${connection.dbname}`], {
      env: { ...process.env, ...connection.env },
      stdio: ["pipe", "ignore", "pipe"],
    });
    const steps = [waitFor(decrypt, "age --decrypt"), waitFor(restore, "pg_restore"), pipeline(decrypt.stdout, restore.stdin)];
    try {
      await Promise.all(steps);
    } catch (error) {
      decrypt.kill("SIGTERM");
      restore.kill("SIGTERM");
      await Promise.allSettled(steps);
      throw error;
    }
    log("pg_restore fertig, prüfe …");

    const checks = await verify(options, manifest);
    return { ok: checks.every((check) => check.ok), manifest, checks };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function verify(options: RestoreOptions, manifest: BackupManifest): Promise<RestoreCheck[]> {
  const checks: RestoreCheck[] = [];
  const db = await connect(options.targetUrl);
  try {
    const after = await inspectDatabase(db);
    const diff = compareTables(manifest.tables, after.tables);
    const rows = Object.values(after.tables).reduce((sum, n) => sum + n, 0);
    checks.push({ name: "Zeilen pro Tabelle", ok: diff.length === 0, detail: diff.length === 0 ? `${Object.keys(after.tables).length} Tabellen, ${rows} Zeilen wie im Manifest` : diff.join("; ") });

    const sameMigrations = after.migrations.latest === manifest.migrations.latest && after.migrations.applied === manifest.migrations.applied;
    checks.push({
      name: "Migrationen",
      ok: sameMigrations,
      detail: `Ziel ${after.migrations.latest ?? "keine"} (${after.migrations.applied}), Manifest ${manifest.migrations.latest ?? "keine"} (${manifest.migrations.applied})`,
    });

    const invalid = await invalidIndexCount(db);
    checks.push({ name: "Indizes gültig", ok: invalid === 0, detail: `${invalid} ungültige Indizes` });

    const fks = await db.query<{ n: string }>("SELECT count(*)::text AS n FROM pg_constraint WHERE contype = 'f'");
    checks.push({ name: "Fremdschlüssel vorhanden", ok: true, detail: `${firstRow(fks).n} Fremdschlüssel` });

    if (manifest.server.serverVersionNum > after.serverVersionNum) {
      checks.push({ name: "Server-Version", ok: true, warning: true, detail: `Ziel ${after.serverVersion} ist älter als die Quelle ${manifest.server.serverVersion}` });
    }
  } finally {
    await db.end().catch(() => undefined);
  }

  const prisma = options.prismaStatus;
  if (prisma) {
    const env = { ...process.env, DATABASE_URL: options.targetUrl };
    const current = prisma.repoLatestMigration === undefined || prisma.repoLatestMigration === manifest.migrations.latest;
    try {
      await capture(prisma.command, prisma.args, env);
      checks.push({ name: "prisma migrate status", ok: true, detail: "Schema entspricht den Migrationen im Repo" });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 400) : "unbekannt";
      // Eine ältere Sicherung hat naturgemäss ausstehende Migrationen; das ist ein Hinweis, kein Fehler.
      checks.push(current ? { name: "prisma migrate status", ok: false, detail } : { name: "prisma migrate status", ok: true, warning: true, detail: `Sicherung älter als der Code (${prisma.repoLatestMigration ?? "?"}): ${detail}` });
    }
  }
  return checks;
}

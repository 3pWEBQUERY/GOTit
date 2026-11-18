import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runBackup } from "./backup";
import { firstRow } from "./postgres";
import { runRestore } from "./restore";
import { dumpKey, manifestKey } from "./retention";
import { createFsBackupStore, type BackupStore } from "./store";

/**
 * Restore-Probe (PRD v1 20.7): echte Sicherung einer Wegwerf-Datenbank mit
 * pg_dump und age in den Treiber fs, Restore in eine zweite Wegwerf-Datenbank,
 * Vergleich von Zeilen und Prüfsumme. Braucht Postgres (DATABASE_URL mit
 * CREATEDB), pg_dump, pg_restore, age und age-keygen; in der CI ist das Pflicht.
 */

function has(command: string): boolean {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const adminUrl = process.env.DATABASE_URL ?? "";
const tools = ["pg_dump", "pg_restore", "age", "age-keygen"].filter((tool) => !has(tool));
const available = adminUrl !== "" && tools.length === 0;

const suffix = randomBytes(4).toString("hex");
const sourceName = `gotit_backup_src_${suffix}`;
const targetName = `gotit_backup_dst_${suffix}`;
function urlFor(database: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function withDb<T>(url: string, run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

const checksum = (url: string) =>
  withDb(url, async (db) => firstRow(await db.query<{ sum: string }>("SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) AS sum FROM item t")).sum);

it("Werkzeuge für die Restore-Probe sind vorhanden (in der CI Pflicht)", () => {
  if (process.env.CI) expect({ databaseUrl: adminUrl !== "", missing: tools }).toEqual({ databaseUrl: true, missing: [] });
});

describe.skipIf(!available)("Sicherung und Restore", () => {
  let dir: string;
  let store: BackupStore;
  let identity: string;
  let recipient: string;
  const now = new Date("2026-11-18T02:13:00Z");
  const stale = new Date("2024-06-05T02:13:00Z");

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "gotit-backup-test-"));
    store = createFsBackupStore(join(dir, "storage"));
    identity = join(dir, "identity.txt");
    execFileSync("age-keygen", ["-o", identity], { stdio: "ignore" });
    recipient = execFileSync("age-keygen", ["-y", identity], { encoding: "utf8" }).trim();

    await withDb(adminUrl, async (db) => {
      await db.query(`CREATE DATABASE ${sourceName}`);
      await db.query(`CREATE DATABASE ${targetName}`);
    });
    await withDb(urlFor(sourceName), async (db) => {
      await db.query(`CREATE TABLE _prisma_migrations (id text PRIMARY KEY, migration_name text NOT NULL, finished_at timestamptz, rolled_back_at timestamptz)`);
      await db.query(`INSERT INTO _prisma_migrations VALUES ('1', '20260101000000_init', now(), NULL), ('2', '20260201000000_more', now(), NULL), ('3', '20260301000000_failed', NULL, NULL)`);
      await db.query(`CREATE TABLE item (id serial PRIMARY KEY, name text NOT NULL, price numeric(10,2), created_at timestamptz NOT NULL DEFAULT now())`);
      await db.query(`CREATE TABLE tag (id serial PRIMARY KEY, item_id int NOT NULL REFERENCES item(id) ON DELETE CASCADE, label text NOT NULL)`);
      await db.query(`CREATE INDEX tag_label_idx ON tag (label)`);
      await db.query(`INSERT INTO item (name, price) SELECT 'Angebot ' || g, g * 1.5 FROM generate_series(1, 250) g`);
      await db.query(`INSERT INTO tag (item_id, label) SELECT (g % 250) + 1, 'tag-' || (g % 7) FROM generate_series(1, 400) g`);
    });
    // Alte Sicherungen, die die Aufbewahrung entfernen muss.
    await store.putText(dumpKey(stale), "alt", "application/octet-stream");
    await store.putText(manifestKey(stale), "{}", "application/json");
  });

  afterAll(async () => {
    await withDb(adminUrl, async (db) => {
      await db.query(`DROP DATABASE IF EXISTS ${sourceName} WITH (FORCE)`);
      await db.query(`DROP DATABASE IF EXISTS ${targetName} WITH (FORCE)`);
    }).catch(() => undefined);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("verweigert die Sicherung ohne Empfänger und lädt nichts hoch", async () => {
    await expect(runBackup({ databaseUrl: urlFor(sourceName), recipients: [], store, workDir: dir, now: () => now })).rejects.toThrow(/unverschlüsselt/);
    expect(await store.list("postgres/2026/")).toEqual([]);
  });

  it("sichert verschlüsselt, schreibt das Manifest, räumt auf und spielt geprüft zurück", async () => {
    const before = await checksum(urlFor(sourceName));
    const result = await runBackup({ databaseUrl: urlFor(sourceName), recipients: [recipient], store, workDir: dir, now: () => now });

    expect(result.key).toBe("postgres/2026/11/18/20261118T021300Z.dump.age");
    expect(result.removed).toEqual([dumpKey(stale), manifestKey(stale)].sort());
    expect(await store.list("postgres/")).toEqual([result.key, manifestKey(now)]);
    expect(result.manifest.tables).toEqual({ "public._prisma_migrations": 3, "public.item": 250, "public.tag": 400 });
    expect(result.manifest.migrations).toEqual({ latest: "20260201000000_more", applied: 2 });
    expect(result.manifest.encryption.recipients).toEqual([recipient]);
    const manifestOnDisk = JSON.parse((await store.getText(manifestKey(now))) ?? "null") as { sha256: string; sizeBytes: number };
    expect(manifestOnDisk.sha256).toBe(result.manifest.sha256);

    // Im Bucket liegt nur Chiffretext: age-Kopf statt der pg_dump-Signatur «PGDMP».
    const raw = join(dir, "raw.age");
    await store.getFile(result.key, raw);
    const head = (await readFile(raw)).subarray(0, 32).toString("latin1");
    expect(head.startsWith("age-encryption.org/v1")).toBe(true);
    expect(head).not.toContain("PGDMP");

    // Nach der Sicherung geschrieben: darf im Restore nicht auftauchen.
    await withDb(urlFor(sourceName), (db) => db.query("INSERT INTO item (name) VALUES ('nach der Sicherung')"));

    const lines: string[] = [];
    const report = await runRestore({
      source: { kind: "store", store, key: result.key },
      identityPath: identity,
      targetUrl: urlFor(targetName),
      protectedUrls: [adminUrl],
      workDir: dir,
      prismaStatus: null,
      log: (line) => lines.push(line),
    });
    expect(report.checks.filter((check) => !check.ok)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(lines).toContain("Prüfsumme stimmt.");
    expect(await checksum(urlFor(targetName))).toBe(before);
    const tags = await withDb(urlFor(targetName), async (db) => firstRow(await db.query<{ n: string }>("SELECT count(*)::text AS n FROM tag JOIN item ON item.id = tag.item_id")).n);
    expect(tags).toBe("400");
  });

  it("spielt nicht über eine bestehende Datenbank ohne --overwrite und nie in die Quelle ohne --i-know", async () => {
    const key = dumpKey(now);
    const base = { source: { kind: "store" as const, store, key }, identityPath: identity, protectedUrls: [] as string[], workDir: dir, prismaStatus: null };
    await expect(runRestore({ ...base, targetUrl: urlFor(targetName) })).rejects.toThrow(/--overwrite/);
    await expect(runRestore({ ...base, targetUrl: urlFor(sourceName), overwrite: true })).rejects.toThrow(/--i-know/);
    await expect(runRestore({ ...base, targetUrl: urlFor(targetName), protectedUrls: [urlFor(targetName)], overwrite: true })).rejects.toThrow(/geschützt/);

    const again = await runRestore({ ...base, targetUrl: urlFor(targetName), overwrite: true });
    expect(again.ok).toBe(true);
  });

  it("bricht bei falscher Prüfsumme ab, bevor er etwas zurückspielt", async () => {
    const key = dumpKey(now);
    const tampered = join(dir, "tampered.age");
    await store.getFile(key, tampered);
    const bytes = await readFile(tampered);
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff;
    await writeFile(tampered, bytes);
    await store.putFile(key, tampered, "application/octet-stream");
    await expect(
      runRestore({ source: { kind: "store", store, key }, identityPath: identity, targetUrl: urlFor(targetName), protectedUrls: [], overwrite: true, workDir: dir, prismaStatus: null }),
    ).rejects.toThrow(/Prüfsumme/);
  });
});

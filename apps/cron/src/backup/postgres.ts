import { spawn, type ChildProcess } from "node:child_process";
import pg from "pg";

/** Bestand einer Datenbank: Grundlage des Manifests und der Prüfung nach dem Restore. */
export interface DatabaseInventory {
  /** `server_version_num`, z. B. 180001. */
  serverVersionNum: number;
  serverVersion: string;
  database: string;
  /** Kennung des Clusters (`pg_control_system`); null ohne Recht. */
  systemIdentifier: string | null;
  /** Neueste abgeschlossene Prisma-Migration und Anzahl angewendeter Migrationen. */
  migrations: { latest: string | null; applied: number };
  /** Zeilen pro Tabelle, Schlüssel `schema.tabelle`, sortiert. */
  tables: Record<string, number>;
}

export type Queryable = Pick<pg.Client, "query">;

/** Erste Zeile einer Abfrage; Fehler, wenn keine kam. */
export function firstRow<T>(result: { rows: T[] }): T {
  const [row] = result.rows;
  if (row === undefined) throw new Error("Abfrage ohne Ergebnis.");
  return row;
}

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

/** Liest den Bestand; in einer Transaktion mit exportiertem Snapshot passt er genau zum Dump. */
export async function inspectDatabase(db: Queryable): Promise<DatabaseInventory> {
  const info = await db.query<{ num: string; version: string; database: string }>(
    "SELECT current_setting('server_version_num') AS num, current_setting('server_version') AS version, current_database() AS database",
  );
  const row = firstRow(info);
  // Ohne Ausführungsrecht bliebe die Transaktion nach einem Fehler abgebrochen; deshalb vorher prüfen.
  const sys = await db.query<{ id: string | null }>(
    "SELECT CASE WHEN has_function_privilege('pg_control_system()', 'EXECUTE') THEN (SELECT system_identifier::text FROM pg_control_system()) END AS id",
  );
  const systemIdentifier = sys.rows[0]?.id ?? null;

  const list = await db.query<{ schema: string; name: string }>(
    `SELECT table_schema AS schema, table_name AS name FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema') AND table_schema NOT LIKE 'pg_toast%'
     ORDER BY table_schema, table_name`,
  );
  const tables: Record<string, number> = {};
  for (const { schema, name } of list.rows) {
    const count = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${quote(schema)}.${quote(name)}`);
    tables[`${schema}.${name}`] = Number(firstRow(count).n);
  }

  let migrations: DatabaseInventory["migrations"] = { latest: null, applied: 0 };
  if ("public._prisma_migrations" in tables) {
    const result = await db.query<{ latest: string | null; applied: string }>(
      "SELECT max(migration_name) AS latest, count(*)::text AS applied FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
    );
    migrations = { latest: result.rows[0]?.latest ?? null, applied: Number(result.rows[0]?.applied ?? 0) };
  }

  return { serverVersionNum: Number(row.num), serverVersion: row.version, database: row.database, systemIdentifier, migrations, tables };
}

/** Indizes, die nach einem Restore ungültig sind (abgebrochener Aufbau); erwartet ist 0. */
export async function invalidIndexCount(db: Queryable): Promise<number> {
  const result = await db.query<{ n: string }>("SELECT count(*)::text AS n FROM pg_index WHERE NOT indisvalid");
  return Number(firstRow(result).n);
}

/** Hauptversion aus `server_version_num` (180001 → 18). */
export const majorOf = (versionNum: number) => Math.floor(versionNum / 10000);

/** Hauptversion aus der Ausgabe von `pg_dump --version`, z. B. «pg_dump (PostgreSQL) 18.1 (Debian …)» → 18. */
export function parseToolMajor(output: string): number | null {
  const match = /\(PostgreSQL\)\s+(\d+)/.exec(output);
  return match ? Number(match[1]) : null;
}

/** Wartet auf das Ende eines Prozesses; Fehler mit Exit-Code und den letzten Zeilen von stderr. */
export function waitFor(child: ChildProcess, label: string): Promise<void> {
  const stderr: string[] = [];
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr.push(chunk);
    if (stderr.length > 50) stderr.shift();
  });
  return new Promise((resolve, reject) => {
    child.once("error", (error) => reject(new Error(`${label} liess sich nicht starten: ${error.message}`)));
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} ist fehlgeschlagen (${signal ?? `Exit ${code}`}): ${stderr.join("").trim().split("\n").slice(-5).join(" | ")}`));
    });
  });
}

/** Führt einen Befehl aus und gibt stdout zurück. */
export async function capture(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => (out += chunk));
  await waitFor(child, command);
  return out;
}

/** Hauptversion eines Postgres-Werkzeugs (`pg_dump`, `pg_restore`). */
export async function toolMajor(command: string): Promise<{ major: number; version: string }> {
  const version = (await capture(command, ["--version"])).trim();
  const major = parseToolMajor(version);
  if (major === null) throw new Error(`Version von ${command} unbekannt: «${version}».`);
  return { major, version };
}

/** Verbindung ohne Pool, wie sie die Cron-Aufgaben einmalig brauchen. */
export async function connect(url: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

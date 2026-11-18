import { tmpdir } from "node:os";
import { DEFAULT_FS_ROOT } from "@app/storage";

/**
 * Konfiguration der Datenbank-Sicherung (Entscheid 0024). Der Bucket `backups`
 * ist bewusst nicht Teil von `@app/storage`: Web und Worker sollen seine
 * Zugangsdaten nie kennen. Die Namen folgen trotzdem dem Schema der übrigen
 * Buckets (`S3_<BUCKET>_BUCKET`, `…_ACCESS_KEY_ID`, `…_SECRET_ACCESS_KEY`).
 */

type Env = Record<string, string | undefined>;

export type BackupStoreConfig =
  | {
      driver: "s3";
      endpoint: string;
      region: string;
      forcePathStyle: boolean;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    }
  | { driver: "fs"; root: string };

/** Öffentlicher age-Schlüssel: `age1` und 58 Zeichen Bech32 (Kleinbuchstaben ohne 1, b, i, o). */
const AGE_RECIPIENT = /^age1[02-9ac-hj-np-z]{58}$/;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} ist nicht gesetzt.`);
  return value;
}

/**
 * Empfänger aus `BACKUP_AGE_RECIPIENTS` (kommagetrennt). Ohne gültigen
 * Empfänger bricht die Sicherung ab: Unverschlüsselt wird nie hochgeladen.
 */
export function parseRecipients(value: string | undefined): string[] {
  const recipients = (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (recipients.length === 0) throw new Error("BACKUP_AGE_RECIPIENTS ist nicht gesetzt; ohne Verschlüsselung wird nichts gesichert.");
  const invalid = recipients.filter((recipient) => !AGE_RECIPIENT.test(recipient));
  if (invalid.length > 0) throw new Error(`BACKUP_AGE_RECIPIENTS enthält ${invalid.length} ungültige Schlüssel; erwartet sind öffentliche age-Schlüssel «age1…».`);
  return [...new Set(recipients)];
}

/** Ablage der Sicherungen: s3 auf Railway, fs nur ausserhalb der Produktion (Tests, lokal). */
export function resolveBackupStoreConfig(env: Env = process.env): BackupStoreConfig {
  const production = env.APP_ENV === "production";
  const driver = env.STORAGE_DRIVER?.trim() || (production ? "" : "fs");
  if (driver === "s3") {
    return {
      driver,
      endpoint: required(env, "S3_ENDPOINT"),
      region: env.S3_REGION?.trim() || "auto",
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "1" || env.S3_FORCE_PATH_STYLE === "true",
      bucket: required(env, "S3_BACKUPS_BUCKET"),
      accessKeyId: required(env, "S3_BACKUPS_ACCESS_KEY_ID"),
      secretAccessKey: required(env, "S3_BACKUPS_SECRET_ACCESS_KEY"),
    };
  }
  if (driver === "fs") {
    if (production) throw new Error("STORAGE_DRIVER=fs ist in der Produktion nicht erlaubt.");
    return { driver, root: env.STORAGE_FS_ROOT?.trim() || DEFAULT_FS_ROOT };
  }
  throw new Error(production ? "STORAGE_DRIVER=s3 ist in der Produktion Pflicht." : `Unbekannter STORAGE_DRIVER «${driver}».`);
}

/** Arbeitsordner für die verschlüsselte Datei vor dem Upload. */
export function backupWorkDir(env: Env = process.env): string {
  return env.BACKUP_TMP_DIR?.trim() || tmpdir();
}

/**
 * Verbindungsdaten für `pg_dump`, `pg_restore` und `psql`: Das Passwort geht
 * über `PGPASSWORD`, nicht über die Befehlszeile, damit es nicht in `ps` steht.
 */
export function libpqConnection(url: string): { dbname: string; env: Record<string, string> } {
  const parsed = new URL(url);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") throw new Error("Die Datenbank-URL muss mit postgresql:// beginnen.");
  const password = decodeURIComponent(parsed.password);
  parsed.password = "";
  return { dbname: parsed.toString(), env: password ? { PGPASSWORD: password } : {} };
}

/** Vergleichbare Form einer Datenbank-URL (Host, Port, Datenbank), ohne Zugangsdaten. */
export function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  const host = (parsed.hostname || "localhost").toLowerCase();
  const port = parsed.port || "5432";
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || decodeURIComponent(parsed.username);
  return `${host}:${port}/${database}`;
}

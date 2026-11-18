/**
 * Schlüssel und Aufbewahrung der Datenbank-Sicherungen (Entscheid 0024).
 * Die Buckets haben keine Lifecycle-Regeln (PRD 14.2); die Sicherung räumt
 * nach jedem Lauf selbst auf. Alles hier ist rein und ohne Ein-/Ausgabe.
 */

export const BACKUP_PREFIX = "postgres/";
export const DUMP_SUFFIX = ".dump.age";
export const MANIFEST_SUFFIX = ".manifest.json";

export interface RetentionPolicy {
  /** Tage, an denen jede Sicherung bleibt (heute eingeschlossen). */
  daily: number;
  /** Wochen (Montag bis Sonntag), aus denen je die neueste Sicherung bleibt, normalerweise die vom Sonntag. */
  weekly: number;
  /** Monate, aus denen je die älteste Sicherung bleibt, normalerweise die vom 1. */
  monthly: number;
}

export const DEFAULT_POLICY: RetentionPolicy = { daily: 14, weekly: 8, monthly: 12 };

const DAY = 86_400_000;
const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** Zeitstempel im Schlüssel: `20261118T021305Z` (UTC, ohne Trenner, sortiert lexikalisch). */
export function formatStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** Basis eines Schlüssels ohne Endung: `postgres/2026/11/18/20261118T021305Z`. */
export function backupBase(date: Date): string {
  return `${BACKUP_PREFIX}${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${formatStamp(date)}`;
}

export const dumpKey = (date: Date) => `${backupBase(date)}${DUMP_SUFFIX}`;
export const manifestKey = (date: Date) => `${backupBase(date)}${MANIFEST_SUFFIX}`;

/** Schlüssel der Manifest-Datei zu einem Dump-Schlüssel. */
export function manifestKeyFor(key: string): string {
  if (!key.endsWith(DUMP_SUFFIX)) throw new Error(`«${key}» ist kein Dump-Schlüssel (${DUMP_SUFFIX}).`);
  return key.slice(0, -DUMP_SUFFIX.length) + MANIFEST_SUFFIX;
}

const KEY = /^postgres\/(\d{4})\/(\d{2})\/(\d{2})\/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z(\.dump\.age|\.manifest\.json)$/;

export interface ParsedKey {
  base: string;
  kind: "dump" | "manifest";
  createdAt: Date;
}

/** Liest Zeitpunkt und Art aus einem Schlüssel; null für fremde oder widersprüchliche Schlüssel. */
export function parseBackupKey(key: string): ParsedKey | null {
  const match = KEY.exec(key);
  if (!match) return null;
  const [, folderYear, folderMonth, folderDay, year, month, day, hours, minutes, seconds, suffix = ""] = match;
  if (folderYear !== year || folderMonth !== month || folderDay !== day) return null;
  const createdAt = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
  if (Number.isNaN(createdAt.getTime()) || formatStamp(createdAt) !== `${year}${month}${day}T${hours}${minutes}${seconds}Z`) return null;
  return { base: key.slice(0, -suffix.length), kind: suffix === DUMP_SUFFIX ? "dump" : "manifest", createdAt };
}

const dayIndex = (date: Date) => Math.floor(date.getTime() / DAY);
/** Woche ab Montag: Tag 0 der Epoche (1.1.1970) war ein Donnerstag. */
const weekIndex = (date: Date) => Math.floor((dayIndex(date) + 3) / 7);
const monthIndex = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth();

interface Backup {
  base: string;
  createdAt: Date;
  keys: string[];
  complete: boolean;
}

export interface RetentionPlan {
  keep: string[];
  remove: string[];
}

/**
 * Plant, welche Objekte bleiben: alle der letzten `daily` Tage, je Woche die
 * neueste und je Monat die älteste vollständige Sicherung (Dump und Manifest)
 * der letzten `weekly` Wochen und `monthly` Monate. Die neueste vollständige
 * Sicherung bleibt immer. Fremde Schlüssel werden nie gelöscht.
 */
export function planRetention(keys: readonly string[], now: Date, policy: RetentionPolicy = DEFAULT_POLICY): RetentionPlan {
  const backups = new Map<string, Backup & { kinds: Set<string> }>();
  const foreign: string[] = [];
  for (const key of keys) {
    const parsed = parseBackupKey(key);
    if (!parsed) {
      foreign.push(key);
      continue;
    }
    const entry = backups.get(parsed.base) ?? { base: parsed.base, createdAt: parsed.createdAt, keys: [], complete: false, kinds: new Set<string>() };
    entry.keys.push(key);
    entry.kinds.add(parsed.kind);
    entry.complete = entry.kinds.has("dump") && entry.kinds.has("manifest");
    backups.set(parsed.base, entry);
  }

  const all = [...backups.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const complete = all.filter((backup) => backup.complete);
  const kept = new Set<string>();

  const today = dayIndex(now);
  for (const backup of all) {
    const day = dayIndex(backup.createdAt);
    // Aus der Zukunft (Uhrzeit verstellt) oder innerhalb der Tagesfrist: bleibt.
    if (day > today || today - day < policy.daily) kept.add(backup.base);
  }

  const thisWeek = weekIndex(now);
  const weeks = new Set<number>();
  for (const backup of complete) {
    const week = weekIndex(backup.createdAt);
    if (thisWeek - week < policy.weekly && !weeks.has(week)) {
      weeks.add(week);
      kept.add(backup.base);
    }
  }

  const thisMonth = monthIndex(now);
  const months = new Set<number>();
  for (const backup of [...complete].reverse()) {
    const month = monthIndex(backup.createdAt);
    if (thisMonth - month < policy.monthly && !months.has(month)) {
      months.add(month);
      kept.add(backup.base);
    }
  }

  if (complete[0]) kept.add(complete[0].base);

  const keep = [...foreign];
  const remove: string[] = [];
  for (const backup of all) (kept.has(backup.base) ? keep : remove).push(...backup.keys);
  return { keep: keep.sort(), remove: remove.sort() };
}

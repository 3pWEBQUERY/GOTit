import { createHash } from "node:crypto";
import { getDb, type StatKind } from "@app/db";
import { createRedisConnection } from "@app/jobs";
import type { Redis } from "ioredis";
import { zonedDay } from "../booking/time-zone";
import { createLogger } from "../observability";

const logger = createLogger("stats");
let redis: Redis | null = null;
export const STAT_TIME_ZONE = "Europe/Zurich";

/**
 * Rohereignisse für die Statistik (PRD v1 7.2/7.3). Ohne Personenbezug: nur
 * Profil, Art und Zeit. Fehler beim Erfassen brechen nie die Seite oder die
 * Aktion ab; sie landen nur im Log.
 */
export async function recordStat(
  providerProfileId: string,
  kind: StatKind,
  extra: { mediaId?: string; searchKey?: string } = {},
  now = new Date(),
): Promise<void> {
  try {
    await getDb().statEvent.create({
      data: {
        providerProfileId,
        kind,
        mediaId: extra.mediaId ?? null,
        searchKey: extra.searchKey ?? null,
        occurredAt: now,
      },
    });
  } catch (error) {
    logger.error("record_failed", {
      kind,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Einblendungen in der Suche: eine Zeile pro gezeigtem Profil, mit dem Filterschlüssel (nie Freitext). */
export async function recordSearchImpressions(
  providerProfileIds: readonly string[],
  searchKey: string,
  now = new Date(),
): Promise<void> {
  if (providerProfileIds.length === 0) return;
  try {
    await getDb().statEvent.createMany({
      data: [...new Set(providerProfileIds)].map((providerProfileId) => ({
        providerProfileId,
        kind: "SEARCH_IMPRESSION" as const,
        searchKey: searchKey.slice(0, 200),
        occurredAt: now,
      })),
    });
  } catch (error) {
    logger.error("record_failed", {
      kind: "SEARCH_IMPRESSION",
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/**
 * Einmal pro Besucher, Profil (oder Medium) und Tag. Der Schlüssel ist ein
 * Hash aus einer Kennung des Besuchers (Konto-ID oder Adresse und Browser, vom
 * Aufrufer), dem Ziel und dem Tag, mit dem Geheimnis der Plattform. Er liegt
 * nur in Redis und verfällt nach 24 Stunden; in der Datenbank steht nie, wer
 * etwas angesehen hat (v1 7.3).
 */
async function firstToday(
  visitorKey: string,
  target: string,
  now: Date,
): Promise<boolean> {
  const day = zonedDay(now, STAT_TIME_ZONE).day;
  const hash = createHash("sha256")
    .update(
      `${process.env.BETTER_AUTH_SECRET ?? ""}|${visitorKey}|${target}|${day}`,
    )
    .digest("base64url")
    .slice(0, 32);
  try {
    redis ??= createRedisConnection();
    return (
      (await redis.set(`stat:seen:${hash}`, "1", "EX", 24 * 3600, "NX")) ===
      "OK"
    );
  } catch {
    // Ohne Redis lieber einmal zu viel zählen als die Seite zu blockieren.
    return true;
  }
}

export async function recordProfileView(
  providerProfileId: string,
  visitorKey: string,
  now = new Date(),
): Promise<void> {
  if (await firstToday(visitorKey, `p:${providerProfileId}`, now))
    await recordStat(providerProfileId, "PROFILE_VIEW", {}, now);
}

export async function recordMediaView(
  providerProfileId: string,
  mediaId: string,
  visitorKey: string,
  now = new Date(),
): Promise<void> {
  if (await firstToday(visitorKey, `m:${mediaId}`, now))
    await recordStat(providerProfileId, "MEDIA_VIEW", { mediaId }, now);
}

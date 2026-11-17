import { getDb, Prisma, type StatKind } from "@app/db";
import { addDays, zonedDay, zonedToUtc } from "../booking/time-zone";
import { STAT_TIME_ZONE } from "./record";

/** Rohereignisse bleiben so viele Tage nach der Aggregation, danach werden sie gelöscht. */
export const RAW_RETENTION_DAYS = 3;

export function dayBounds(day: string): { from: Date; to: Date } {
  return {
    from: zonedToUtc(day, 0, STAT_TIME_ZONE),
    to: zonedToUtc(addDays(day, 1), 0, STAT_TIME_ZONE),
  };
}

/**
 * Tagesaggregation (v2 14.5 `StatDaily`): fasst die Rohereignisse eines
 * abgeschlossenen Zürcher Kalendertags zusammen, je Profil und Art sowie je
 * Medium und Suchschlüssel. Wiederholbar: Ein zweiter Lauf schreibt dieselben
 * Zahlen. Der laufende Tag wird nie aggregiert.
 */
export async function aggregateDay(
  day: string,
  now = new Date(),
): Promise<{ rows: number }> {
  if (day >= zonedDay(now, STAT_TIME_ZONE).day)
    throw new Error("Der laufende Tag wird nicht aggregiert.");
  const { from, to } = dayBounds(day);
  const db = getDb();
  const groups = await db.$queryRaw<
    {
      providerProfileId: string;
      kind: StatKind;
      dimension: string;
      count: bigint;
    }[]
  >`
    SELECT "providerProfileId", kind, '' AS dimension, count(*) AS count FROM stat_event
      WHERE "occurredAt" >= ${from} AND "occurredAt" < ${to} GROUP BY "providerProfileId", kind
    UNION ALL
    SELECT "providerProfileId", kind, "mediaId" AS dimension, count(*) FROM stat_event
      WHERE "occurredAt" >= ${from} AND "occurredAt" < ${to} AND kind = 'MEDIA_VIEW' AND "mediaId" IS NOT NULL GROUP BY "providerProfileId", kind, "mediaId"
    UNION ALL
    SELECT "providerProfileId", kind, "searchKey" AS dimension, count(*) FROM stat_event
      WHERE "occurredAt" >= ${from} AND "occurredAt" < ${to} AND kind = 'SEARCH_IMPRESSION' AND "searchKey" IS NOT NULL AND "searchKey" <> '' GROUP BY "providerProfileId", kind, "searchKey"`;
  await db.$transaction([
    db.statDaily.deleteMany({ where: { day } }),
    db.statDaily.createMany({
      data: groups.map((group) => ({
        providerProfileId: group.providerProfileId,
        day,
        kind: group.kind,
        dimension: group.dimension,
        count: Number(group.count),
      })),
    }),
    db.statAggregatedDay.upsert({
      where: { day },
      create: { day },
      update: { aggregatedAt: now },
    }),
  ]);
  return { rows: groups.length };
}

/**
 * Nächtlich im Cron-Dienst: alle noch nicht aggregierten, abgeschlossenen
 * Tage mit Rohereignissen aggregieren, dann Rohereignisse aggregierter Tage
 * nach der Frist löschen (Datensparsamkeit, v1 7.3).
 */
export async function aggregatePendingDays(
  now = new Date(),
): Promise<{ days: string[]; deleted: number }> {
  const db = getDb();
  const today = zonedDay(now, STAT_TIME_ZONE).day;
  const oldest = await db.statEvent.findFirst({
    orderBy: { occurredAt: "asc" },
    select: { occurredAt: true },
  });
  const days: string[] = [];
  if (oldest) {
    const aggregated = new Set(
      (await db.statAggregatedDay.findMany({ select: { day: true } })).map(
        (row) => row.day,
      ),
    );
    for (
      let day = zonedDay(oldest.occurredAt, STAT_TIME_ZONE).day;
      day < today;
      day = addDays(day, 1)
    ) {
      // Kürzlich aggregierte Tage werden erneut gerechnet, solange ihre Rohereignisse noch da sind.
      if (aggregated.has(day) && day < addDays(today, -RAW_RETENTION_DAYS))
        continue;
      await aggregateDay(day, now);
      days.push(day);
    }
  }
  const cutoff = dayBounds(addDays(today, -RAW_RETENTION_DAYS)).from;
  const aggregatedBefore = (
    await db.statAggregatedDay.findMany({
      where: { day: { lt: addDays(today, -RAW_RETENTION_DAYS) } },
      select: { day: true },
    })
  ).map((row) => row.day);
  let deleted = 0;
  if (aggregatedBefore.length > 0) {
    const result =
      await db.$executeRaw`DELETE FROM stat_event WHERE "occurredAt" < ${cutoff} AND to_char("occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE ${STAT_TIME_ZONE}, 'YYYY-MM-DD') IN (${Prisma.join(aggregatedBefore)})`;
    deleted = Number(result);
  }
  return { days, deleted };
}

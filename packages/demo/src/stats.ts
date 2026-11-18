import { addDays, zonedDay, zonedToUtc } from "@app/core/booking";
import { EMPTY_QUERY } from "@app/core/search/query";
import { STAT_TIME_ZONE, impressionSearchKey } from "@app/core/stats";
import type { PrismaClient, StatKind } from "@app/db";
import { profileId } from "./ids";
import { createRandom } from "./random";

/**
 * Kennzahlen der letzten 30 Tage für Studio «Heute» und Statistik (Entscheid
 * 0019, 0023). Geschrieben wird wie im Betrieb: Rohereignisse für jeden Tag bis
 * jetzt. Für Tage, die die nächtliche Aggregation schon abgeschlossen hat,
 * zusätzlich die Tageszahlen, denn für diese Tage liest die Statistik nur
 * `stat_daily`. Die Aggregation selbst und `stat_aggregated_day` bleiben
 * unberührt; so zählen echte Ereignisse anderer Profile weiter richtig.
 */
const DAYS = 30;

const SEARCH_KEYS = [
  impressionSearchKey(EMPTY_QUERY),
  impressionSearchKey({ ...EMPTY_QUERY, photos: true }),
  impressionSearchKey({ ...EMPTY_QUERY, languages: ["de"] }),
];

interface DayCounts {
  kind: StatKind;
  count: number;
  /** Medien-ID oder Suchschlüssel je Ereignis. */
  dimension?: (index: number) => string;
}

export async function seedStats(db: PrismaClient, providerKeys: readonly string[], now: Date): Promise<number> {
  const today = zonedDay(now, STAT_TIME_ZONE).day;
  const days = Array.from({ length: DAYS }, (_, index) => addDays(today, index - (DAYS - 1)));
  const aggregated = new Set((await db.statAggregatedDay.findMany({ where: { day: { in: days } }, select: { day: true } })).map((row) => row.day));
  let written = 0;
  for (const [position, key] of providerKeys.entries()) {
    const providerProfileId = profileId(key);
    await db.statEvent.deleteMany({ where: { providerProfileId } });
    await db.statDaily.deleteMany({ where: { providerProfileId } });
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: providerProfileId }, select: { regions: { select: { region: { select: { slug: true } } } } } });
    const regionKeys = profile.regions.map(({ region }) => impressionSearchKey({ ...EMPTY_QUERY, region: region.slug }));
    const searchKeys = [...SEARCH_KEYS, ...regionKeys];
    const media = (await db.mediaAsset.findMany({ where: { providerProfileId, status: "PUBLISHED", deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((row) => row.id);
    const popularity = 1 + (providerKeys.length - position) / providerKeys.length;

    for (const [dayIndex, day] of days.entries()) {
      const random = createRandom(`stats:${key}:${day}`);
      const weekday = zonedDay(zonedToUtc(day, 12 * 60, STAT_TIME_ZONE), STAT_TIME_ZONE).weekday;
      const weekend = weekday === 5 || weekday === 6 ? 1.4 : 1;
      const trend = 0.7 + (dayIndex / DAYS) * 0.6;
      const scale = popularity * weekend * trend;
      const views = Math.round(random.int(6, 18) * scale);
      const plan: DayCounts[] = [
        { kind: "SEARCH_IMPRESSION", count: Math.round(random.int(40, 90) * scale), dimension: (index) => searchKeys[index % searchKeys.length] ?? "-" },
        { kind: "PROFILE_VIEW", count: views },
        { kind: "CONTACT_ACTION", count: random.int(0, Math.max(1, Math.round(views / 8))) },
        { kind: "BOOKING_REQUEST", count: random.int(0, 2) },
        { kind: "BOOKING_CONFIRMED", count: random.int(0, 1) },
        { kind: "FAVORITE_ADDED", count: random.int(0, 3) },
        { kind: "FAVORITE_REMOVED", count: random.int(0, 1) },
      ];
      if (media.length > 0) plan.push({ kind: "MEDIA_VIEW", count: Math.round(views * 0.8), dimension: (index) => media[(index * 7 + dayIndex) % media.length] ?? "" });

      // Heute nur Ereignisse bis jetzt, verteilt über die vergangenen Stunden.
      const start = zonedToUtc(day, 0, STAT_TIME_ZONE).getTime();
      const end = day === today ? now.getTime() : zonedToUtc(addDays(day, 1), 0, STAT_TIME_ZONE).getTime();
      const share = day === today ? (end - start) / 86_400_000 : 1;
      const events: { providerProfileId: string; kind: StatKind; mediaId: string | null; searchKey: string | null; occurredAt: Date }[] = [];
      const daily = new Map<string, number>();
      for (const entry of plan) {
        const count = Math.round(entry.count * share);
        for (let index = 0; index < count; index += 1) {
          const dimension = entry.dimension?.(index) ?? "";
          events.push({
            providerProfileId,
            kind: entry.kind,
            mediaId: entry.kind === "MEDIA_VIEW" ? dimension : null,
            searchKey: entry.kind === "SEARCH_IMPRESSION" ? dimension : null,
            occurredAt: new Date(start + Math.floor(random.next() * (end - start))),
          });
          daily.set(`${entry.kind}|`, (daily.get(`${entry.kind}|`) ?? 0) + 1);
          if (dimension) daily.set(`${entry.kind}|${dimension}`, (daily.get(`${entry.kind}|${dimension}`) ?? 0) + 1);
        }
      }
      if (events.length > 0) await db.statEvent.createMany({ data: events });
      written += events.length;
      if (aggregated.has(day)) {
        await db.statDaily.createMany({
          data: [...daily.entries()].map(([entry, count]) => {
            const [kind, dimension] = entry.split("|") as [StatKind, string];
            return { providerProfileId, day, kind, dimension, count };
          }),
        });
      }
    }
  }
  return written;
}

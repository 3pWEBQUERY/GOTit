import { getDb, type StatKind } from "@app/db";
import { addDays, zonedDay } from "../booking/time-zone";
import { dayBounds } from "./aggregate";
import { STAT_TIME_ZONE } from "./record";

/**
 * Kennzahlen eines Profils über Zürcher Kalendertage (v2 11.1, 11.6). Für
 * aggregierte Tage zählen die Tageszahlen, für alle anderen (der laufende Tag,
 * noch nicht aggregierte) die Rohereignisse. Nie einzelne Besucher.
 */
export interface DayRange {
  from: string;
  to: string;
}

export const MAX_RANGE_DAYS = 366;

export function rangeEndingToday(days: number, now = new Date()): DayRange {
  const to = zonedDay(now, STAT_TIME_ZONE).day;
  return { from: addDays(to, -(days - 1)), to };
}

export function previousRange(range: DayRange): DayRange {
  const length = daysIn(range).length;
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

export function daysIn(range: DayRange): string[] {
  const days: string[] = [];
  for (
    let day = range.from;
    day <= range.to && days.length <= MAX_RANGE_DAYS;
    day = addDays(day, 1)
  )
    days.push(day);
  return days;
}

type Counts = Map<string, number>;
const key = (day: string, kind: StatKind, dimension: string) =>
  `${day}|${kind}|${dimension}`;

/** Zählt je Tag, Art und Dimension, gemischt aus Tageszahlen und Rohereignissen. */
async function countsFor(
  providerProfileId: string,
  range: DayRange,
): Promise<Counts> {
  const db = getDb();
  const days = daysIn(range);
  const aggregated = new Set(
    (
      await db.statAggregatedDay.findMany({
        where: { day: { in: days } },
        select: { day: true },
      })
    ).map((row) => row.day),
  );
  const counts: Counts = new Map();
  const add = (k: string, value: number) =>
    counts.set(k, (counts.get(k) ?? 0) + value);
  const daily = await db.statDaily.findMany({
    where: { providerProfileId, day: { in: [...aggregated] } },
    select: { day: true, kind: true, dimension: true, count: true },
  });
  for (const row of daily)
    add(key(row.day, row.kind, row.dimension), row.count);
  const rawDays = days.filter((day) => !aggregated.has(day));
  if (rawDays.length > 0) {
    const events = await db.statEvent.findMany({
      where: {
        providerProfileId,
        occurredAt: {
          gte: dayBounds(rawDays[0] as string).from,
          lt: dayBounds(rawDays[rawDays.length - 1] as string).to,
        },
      },
      select: { kind: true, occurredAt: true, mediaId: true, searchKey: true },
    });
    for (const event of events) {
      const day = zonedDay(event.occurredAt, STAT_TIME_ZONE).day;
      if (aggregated.has(day)) continue;
      add(key(day, event.kind, ""), 1);
      if (event.kind === "MEDIA_VIEW" && event.mediaId)
        add(key(day, event.kind, event.mediaId), 1);
      if (event.kind === "SEARCH_IMPRESSION" && event.searchKey)
        add(key(day, event.kind, event.searchKey), 1);
    }
  }
  return counts;
}

function total(counts: Counts, range: DayRange, kind: StatKind): number {
  return daysIn(range).reduce(
    (sum, day) => sum + (counts.get(key(day, kind, "")) ?? 0),
    0,
  );
}

export interface Kpi {
  value: number;
  previous: number;
}

export interface StatsOverview {
  range: DayRange;
  kpis: {
    profileViews: Kpi;
    contactActions: Kpi;
    bookingRequests: Kpi;
    favoritesNet: Kpi;
  };
  funnel: {
    impressions: number;
    profileViews: number;
    contactActions: number;
    bookingRequests: number;
    confirmed: number;
  };
  viewsPerDay: { day: string; value: number }[];
  searches: { searchKey: string; impressions: number }[];
  media: { mediaId: string; views: number }[];
}

/** Alles für «Heute» und die Statistik in einem Zug. */
export async function statsOverview(
  providerProfileId: string,
  range: DayRange,
): Promise<StatsOverview> {
  const previous = previousRange(range);
  const [current, before] = await Promise.all([
    countsFor(providerProfileId, range),
    countsFor(providerProfileId, previous),
  ]);
  const kpi = (kind: StatKind): Kpi => ({
    value: total(current, range, kind),
    previous: total(before, previous, kind),
  });
  const net = (counts: Counts, r: DayRange) =>
    total(counts, r, "FAVORITE_ADDED") - total(counts, r, "FAVORITE_REMOVED");
  const byDimension = (kind: StatKind) => {
    const sums = new Map<string, number>();
    for (const [k, value] of current) {
      const [day, rowKind, dimension] = k.split("|") as [
        string,
        StatKind,
        string,
      ];
      if (
        rowKind !== kind ||
        dimension === "" ||
        day < range.from ||
        day > range.to
      )
        continue;
      sums.set(dimension, (sums.get(dimension) ?? 0) + value);
    }
    return [...sums.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20);
  };
  return {
    range,
    kpis: {
      profileViews: kpi("PROFILE_VIEW"),
      contactActions: kpi("CONTACT_ACTION"),
      bookingRequests: kpi("BOOKING_REQUEST"),
      favoritesNet: {
        value: net(current, range),
        previous: net(before, previous),
      },
    },
    funnel: {
      impressions: total(current, range, "SEARCH_IMPRESSION"),
      profileViews: total(current, range, "PROFILE_VIEW"),
      contactActions: total(current, range, "CONTACT_ACTION"),
      bookingRequests: total(current, range, "BOOKING_REQUEST"),
      confirmed: total(current, range, "BOOKING_CONFIRMED"),
    },
    viewsPerDay: daysIn(range).map((day) => ({
      day,
      value: current.get(key(day, "PROFILE_VIEW", "")) ?? 0,
    })),
    searches: byDimension("SEARCH_IMPRESSION").map(
      ([searchKey, impressions]) => ({ searchKey, impressions }),
    ),
    media: byDimension("MEDIA_VIEW").map(([mediaId, views]) => ({
      mediaId,
      views,
    })),
  };
}

/** Eigenes Profil des Kontos, für die Studio-Seiten. */
export async function ownStatsOverview(
  userId: string,
  range: DayRange,
): Promise<StatsOverview | null> {
  const profile = await getDb().providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile ? statsOverview(profile.id, range) : null;
}

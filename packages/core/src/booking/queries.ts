import { getDb, type BookingStatus, type Prisma } from "@app/db";
import { pickLocalizedName, type Locale } from "../locale";
import { participantOf } from "../messaging/access";
import { freeIntervals, type Interval } from "./availability";
import { availabilityInput, calendarSettings } from "./calendar";
import { allowedActions, type BookingAction, type BookingRole } from "./status";
import { zonedDay } from "./time-zone";

/**
 * Lesesichten auf Anfragen (v2 11.5, 12.1). Private Terminangaben sind
 * geschützt (Abnahme 20.5): Jede Sicht beginnt beim eigenen Konto; die Notiz
 * des Anbieters sieht nur der Anbieter; Dritte sehen nichts.
 */
export const REQUEST_TABS = [
  "offen",
  "abstimmung",
  "bestaetigt",
  "vergangen",
] as const;
export type RequestTab = (typeof REQUEST_TABS)[number];

function tabWhere(tab: RequestTab, now: Date): Prisma.BookingRequestWhereInput {
  switch (tab) {
    case "offen":
      return { status: "REQUESTED" };
    case "abstimmung":
      return { status: "NEGOTIATING" };
    case "bestaetigt":
      return { status: "CONFIRMED", endsAt: { gt: now } };
    case "vergangen":
      return {
        OR: [
          {
            status: {
              in: ["DECLINED", "CANCELLED", "EXPIRED", "COMPLETED", "DISPUTED"],
            },
          },
          { status: "CONFIRMED", endsAt: { lte: now } },
        ],
      };
  }
}

export interface RequestSummary {
  id: string;
  conversationId: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  expiresAt: Date;
  timeZone: string;
  counterpartName: string | null;
  profileSlug: string;
  lastProposedBy: BookingRole;
}

/** Mitglied: eigene Anfragen (`/termine`). Anbieter: Anfragen an das eigene Profil (`/studio/anfragen`). */
export async function listRequests(
  userId: string,
  role: BookingRole,
  tab: RequestTab,
  now = new Date(),
): Promise<RequestSummary[]> {
  const db = getDb();
  const owner =
    role === "MEMBER"
      ? { memberUserId: userId }
      : { providerProfile: { userId } };
  const rows = await db.bookingRequest.findMany({
    where: { ...owner, ...tabWhere(tab, now) },
    orderBy: tab === "vergangen" ? { startsAt: "desc" } : { startsAt: "asc" },
    take: 200,
    select: {
      id: true,
      conversationId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      expiresAt: true,
      lastProposedBy: true,
      memberUserId: true,
      providerProfile: { select: { id: true, slug: true, displayName: true } },
    },
  });
  const members =
    role === "PROVIDER"
      ? await db.user.findMany({
          where: { id: { in: rows.map((row) => row.memberUserId) } },
          select: { id: true, username: true },
        })
      : [];
  const zones = new Map<string, string>();
  for (const row of rows)
    if (!zones.has(row.providerProfile.id))
      zones.set(
        row.providerProfile.id,
        (await calendarSettings(row.providerProfile.id)).timeZone,
      );
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    expiresAt: row.expiresAt,
    timeZone: zones.get(row.providerProfile.id) ?? "Europe/Zurich",
    counterpartName:
      role === "MEMBER"
        ? row.providerProfile.displayName
        : (members.find((member) => member.id === row.memberUserId)?.username ??
          null),
    profileSlug: row.providerProfile.slug,
    lastProposedBy: row.lastProposedBy,
  }));
}

export interface RequestDetail extends RequestSummary {
  role: BookingRole;
  message: string | null;
  regionName: string | null;
  providerNote: string | null;
  actions: BookingAction[];
  events: {
    id: string;
    actorRole: BookingRole | null;
    action: string;
    toStatus: BookingStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    reason: string | null;
    createdAt: Date;
  }[];
}

export async function getRequestDetail(
  userId: string,
  requestId: string,
  locale: Locale,
  now = new Date(),
): Promise<RequestDetail | null> {
  if (requestId.length > 64) return null;
  const db = getDb();
  const row = await db.bookingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      conversationId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      expiresAt: true,
      lastProposedBy: true,
      message: true,
      providerNote: true,
      regionId: true,
      memberUserId: true,
      providerProfile: { select: { id: true, slug: true, displayName: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          actorRole: true,
          action: true,
          toStatus: true,
          startsAt: true,
          endsAt: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });
  if (!row) return null;
  const participation = await participantOf(userId, row.conversationId);
  if (!participation) return null;
  const [region, member, settings] = await Promise.all([
    row.regionId
      ? db.region.findUnique({
          where: { id: row.regionId },
          select: { nameDe: true, nameFr: true, nameIt: true, nameEn: true },
        })
      : null,
    participation.role === "PROVIDER"
      ? db.user.findUnique({
          where: { id: row.memberUserId },
          select: { username: true },
        })
      : null,
    calendarSettings(row.providerProfile.id),
  ]);
  return {
    id: row.id,
    conversationId: row.conversationId,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    expiresAt: row.expiresAt,
    timeZone: settings.timeZone,
    counterpartName:
      participation.role === "MEMBER"
        ? row.providerProfile.displayName
        : (member?.username ?? null),
    profileSlug: row.providerProfile.slug,
    lastProposedBy: row.lastProposedBy,
    role: participation.role,
    message: row.message,
    regionName: region ? pickLocalizedName(region, locale) : null,
    providerNote: participation.role === "PROVIDER" ? row.providerNote : null,
    actions: allowedActions(row, participation.role, now),
    events: row.events,
  };
}

/** Anfragen einer Unterhaltung, für die Karte im Thread (v2 11.4). */
export async function requestsInConversation(
  userId: string,
  conversationId: string,
): Promise<
  {
    id: string;
    status: BookingStatus;
    startsAt: Date;
    endsAt: Date;
    createdAt: Date;
  }[]
> {
  if (!(await participantOf(userId, conversationId))) return [];
  return getDb().bookingRequest.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
  });
}

export interface CalendarEntry {
  kind: "available" | "request" | "confirmed" | "absence" | "blocker";
  id: string | null;
  start: Date;
  end: Date;
  note: string | null;
  status: BookingStatus | null;
}

/** Einträge des eigenen Kalenders zwischen zwei Zeitpunkten (v2 11.5). */
export async function calendarEntries(
  userId: string,
  from: Date,
  to: Date,
): Promise<{ timeZone: string; entries: CalendarEntry[] } | null> {
  const db = getDb();
  const profile = await db.providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return null;
  const input = await availabilityInput(profile.id, from, to);
  const [blocks, requests] = await Promise.all([
    db.calendarBlock.findMany({
      where: {
        providerProfileId: profile.id,
        endsAt: { gt: from },
        startsAt: { lt: to },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.bookingRequest.findMany({
      where: {
        providerProfileId: profile.id,
        status: { in: ["REQUESTED", "NEGOTIATING", "CONFIRMED", "COMPLETED"] },
        endsAt: { gt: from },
        startsAt: { lt: to },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const free = freeIntervals(
    { ...input, blocks: [], bookings: [] },
    zonedDay(from, input.timeZone).day,
    zonedDay(to, input.timeZone).day,
  ).filter((slot) => slot.end > from && slot.start < to);
  return {
    timeZone: input.timeZone,
    entries: [
      ...free.map(
        (slot: Interval): CalendarEntry => ({
          kind: "available",
          id: null,
          start: slot.start,
          end: slot.end,
          note: null,
          status: null,
        }),
      ),
      ...blocks.map(
        (block): CalendarEntry => ({
          kind: block.kind === "ABSENCE" ? "absence" : "blocker",
          id: block.id,
          start: block.startsAt,
          end: block.endsAt,
          note: block.note,
          status: null,
        }),
      ),
      ...requests.map(
        (request): CalendarEntry => ({
          kind:
            request.status === "CONFIRMED" || request.status === "COMPLETED"
              ? "confirmed"
              : "request",
          id: request.id,
          start: request.startsAt,
          end: request.endsAt,
          note: null,
          status: request.status,
        }),
      ),
    ].sort((a, b) => a.start.getTime() - b.start.getTime()),
  };
}

/**
 * Öffentlich: freie Zeiten eines Profils für das Anfrageformular (v2 10.2,
 * «nur Tage mit Verfügbarkeit wählbar»). Ohne Notizen, ohne Anfragen Dritter;
 * nur, ob eine Zeit frei ist.
 */
export async function publicFreeSlots(
  providerProfileId: string,
  now = new Date(),
  days = 14,
): Promise<{ timeZone: string; slots: Interval[]; minNoticeHours: number }> {
  const to = new Date(now.getTime() + days * 24 * 3600_000);
  const input = await availabilityInput(providerProfileId, now, to);
  const earliest = new Date(
    now.getTime() + input.settings.minNoticeHours * 3600_000,
  );
  const slots = freeIntervals(
    input,
    zonedDay(now, input.timeZone).day,
    zonedDay(to, input.timeZone).day,
  )
    .map((slot) => ({
      start: slot.start < earliest ? earliest : slot.start,
      end: slot.end,
    }))
    .filter((slot) => slot.end > slot.start);
  return {
    timeZone: input.timeZone,
    slots,
    minNoticeHours: input.settings.minNoticeHours,
  };
}

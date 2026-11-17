import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { query, type FreshAccount } from "./admin-fixtures";
import {
  createConversation,
  createProvider,
  type FictiveProvider,
} from "./messages-fixtures";

/**
 * Hilfen für die Specs des Studio-Kalenders (Schritt 1.9, Entscheid 0016):
 * fiktive Anbieter mit Arbeitszeiten und Terminanfragen per SQL. Zeiten
 * stehen als Tag und Uhrzeit in Zürich; die Datenbank rechnet sie in UTC um.
 */
export const ZONE = "Europe/Zurich";

/** Kalendertag `YYYY-MM-DD` in `days` Tagen (in Zürich gezählt). */
export function dayIn(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** `TT.MM.JJJJ` für Datumsfelder. */
export function swiss(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

/** Anbieter mit Einstellungen und Arbeitszeiten an allen Tagen, 08:00 bis 22:00. */
export async function createBookingProvider(
  created: string[],
  options: { windows?: boolean; exclusive?: boolean } = {},
): Promise<FictiveProvider> {
  const provider = await createProvider(created);
  await query(
    `insert into calendar_settings ("providerProfileId", "timeZone", "bufferMinutes", "exclusiveBooking", "requestTtlHours", "minNoticeHours", "updatedAt") values ($1, $2, 0, $3, 48, 2, now())`,
    [provider.profileId, ZONE, options.exclusive ?? true],
  );
  if (options.windows ?? true)
    for (let weekday = 0; weekday < 7; weekday += 1)
      await query(
        `insert into availability_window (id, "providerProfileId", weekday, "startMinute", "endMinute") values ($1, $2, $3, 480, 1320)`,
        [`e2e_win_${randomUUID()}`, provider.profileId, weekday],
      );
  return provider;
}

const local = (param: number, hourParam: number) =>
  `((($${param}::date + make_interval(mins => $${hourParam}))::timestamp at time zone '${ZONE}') at time zone 'UTC')`;

export interface FictiveRequest {
  id: string;
  conversationId: string;
}

/** Terminanfrage mit eigener Unterhaltung und Ereignis «created», am Tag `day` ab `startMinute` (Zürich). */
export async function createRequest(
  member: FreshAccount,
  provider: FictiveProvider,
  options: {
    day: string;
    startMinute: number;
    minutes?: number;
    status?: "REQUESTED" | "NEGOTIATING" | "CONFIRMED" | "CANCELLED";
    lastProposedBy?: "MEMBER" | "PROVIDER";
    message?: string;
  },
): Promise<FictiveRequest> {
  // Eine Unterhaltung pro Paar; mehrere Anfragen hängen an derselben.
  const [existing] = await query<{ id: string }>(
    `select id from conversation where "memberUserId" = $1 and "providerProfileId" = $2`,
    [member.id, provider.profileId],
  );
  const conversationId =
    existing?.id ??
    (await createConversation(member, provider, [
      {
        from: "member",
        body: "Fiktive Nachricht zur Anfrage.",
        minutesAgo: 30,
      },
    ]));
  const id = `e2e_req_${randomUUID()}`;
  const end = options.startMinute + (options.minutes ?? 60);
  await query(
    `insert into booking_request (id, "conversationId", "providerProfileId", "memberUserId", status, "startsAt", "endsAt", "lastProposedBy", message, "expiresAt", "updatedAt")
     values ($1, $2, $3, $4, $5, ${local(6, 7)}, ${local(6, 8)}, $9, $10, now() + interval '40 hours', now())`,
    [
      id,
      conversationId,
      provider.profileId,
      member.id,
      options.status ?? "REQUESTED",
      options.day,
      options.startMinute,
      end,
      options.lastProposedBy ?? "MEMBER",
      options.message ?? "Fiktive Anfrage für den Test.",
    ],
  );
  await query(
    `insert into booking_event (id, "requestId", "actorRole", action, "toStatus", "createdAt") values ($1, $2, 'MEMBER', 'created', 'REQUESTED', now() - interval '20 minutes')`,
    [`e2e_evt_${randomUUID()}`, id],
  );
  if (options.status === "CONFIRMED")
    await query(
      `insert into booking_event (id, "requestId", "actorRole", action, "fromStatus", "toStatus", "createdAt") values ($1, $2, 'PROVIDER', 'accept', 'REQUESTED', 'CONFIRMED', now() - interval '10 minutes')`,
      [`e2e_evt_${randomUUID()}`, id],
    );
  return { id, conversationId };
}

export async function requestRow(id: string) {
  const [row] = await query<{
    status: string;
    lastProposedBy: string;
    providerNote: string | null;
    start: string;
  }>(
    `select status, "lastProposedBy", "providerNote", to_char(("startsAt" at time zone 'UTC') at time zone '${ZONE}', 'YYYY-MM-DD HH24:MI') as start from booking_request where id = $1`,
    [id],
  );
  return row;
}

export async function setUsername(
  account: FreshAccount,
  username: string,
): Promise<void> {
  await query(`update "user" set username = $2 where id = $1`, [
    account.id,
    username,
  ]);
}

/** Kalender in einer festen Ansicht und Woche öffnen. */
export async function openCalendar(
  page: Page,
  view: "tag" | "woche" | "monat",
  day: string,
): Promise<void> {
  await page.goto(`/de/studio/kalender?ansicht=${view}&datum=${day}`);
}

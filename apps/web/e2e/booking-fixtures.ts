import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { query, type FreshAccount } from "./admin-fixtures";
import {
  createConversation,
  createProvider,
  type FictiveProvider,
} from "./messages-fixtures";

/**
 * Hilfen für die Specs der Terminanfragen (Entscheid 0016): fiktive Anbieter
 * mit Kalender per SQL, wie ihn `saveWeeklyWindows` und `saveCalendarSettings`
 * speichern, und Anfragen samt Ereignis wie `createBookingRequest`.
 */
export const ZONE = "Europe/Zurich";

/** Kalendertag und Wochentag (0 = Sonntag) in Zürich, `offset` Tage ab heute. */
export function zurichDay(offset: number): { day: string; weekday: number } {
  const date = new Date(Date.now() + offset * 24 * 3600_000);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
      weekday: "short",
    }).format(date),
  );
  return { day, weekday };
}

/** Wie das Formular einen Tag nennt, zum Beispiel «Do., 19.11.2026». */
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

/**
 * Anbieter mit Fenstern 10:00–22:00 an jedem Wochentag ausser `closedWeekday`.
 * Ohne `windows: false` nimmt er Anfragen an; Zone Zürich, Vorlauf 2 Stunden.
 */
export async function createBookableProvider(
  created: string[],
  options: { closedWeekday?: number; windows?: boolean } = {},
): Promise<FictiveProvider> {
  const provider = await createProvider(created);
  await query(
    `update provider_profile set "allowBookingRequests" = true where id = $1`,
    [provider.profileId],
  );
  await query(
    `insert into calendar_settings ("providerProfileId", "timeZone", "minNoticeHours", "updatedAt") values ($1, $2, 2, now())`,
    [provider.profileId, ZONE],
  );
  if (options.windows !== false)
    for (let weekday = 0; weekday < 7; weekday += 1)
      if (weekday !== options.closedWeekday)
        await query(
          `insert into availability_window (id, "providerProfileId", weekday, "startMinute", "endMinute") values ($1, $2, $3, 600, 1320)`,
          [`e2e_win_${randomUUID()}`, provider.profileId, weekday],
        );
  return provider;
}

/** UTC-Zeitpunkt für einen Tag und eine Uhrzeit in Zürich (Winterzeit wie Sommerzeit über die Abweichung). */
export function zurichTime(day: string, time: string): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(guess);
  const [h, m] = local.split(":").map(Number) as [number, number];
  const [th, tm] = time.split(":").map(Number) as [number, number];
  return new Date(
    guess.getTime() - ((h * 60 + m - (th * 60 + tm) + 1440) % 1440) * 60_000,
  );
}

/** Offene Anfrage des Mitglieds, mit Unterhaltung und Ereignis «Angefragt». */
export async function createRequest(
  member: FreshAccount,
  provider: FictiveProvider,
  startsAt: Date,
  minutes = 60,
): Promise<{ requestId: string; conversationId: string }> {
  const conversationId = await createConversation(member, provider, [
    {
      from: "member",
      body: "Guten Tag, ich frage einen Termin an.",
      minutesAgo: 30,
    },
  ]);
  const requestId = `e2e_req_${randomUUID()}`;
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  await query(
    `insert into booking_request (id, "conversationId", "providerProfileId", "memberUserId", status, "startsAt", "endsAt", "lastProposedBy", "expiresAt", message, "updatedAt")
     values ($1, $2, $3, $4, 'REQUESTED', $5, $6, 'MEMBER', now() + interval '48 hours', 'Fiktive Nachricht zur Anfrage.', now())`,
    [
      requestId,
      conversationId,
      provider.profileId,
      member.id,
      startsAt,
      endsAt,
    ],
  );
  await query(
    `insert into booking_event (id, "requestId", "actorRole", action, "toStatus", "startsAt", "endsAt") values ($1, $2, 'MEMBER', 'created', 'REQUESTED', $3, $4)`,
    [`e2e_evt_${randomUUID()}`, requestId, startsAt, endsAt],
  );
  return { requestId, conversationId };
}

export async function requestStatus(
  requestId: string,
): Promise<string | undefined> {
  const [row] = await query<{ status: string }>(
    `select status::text as status from booking_request where id = $1`,
    [requestId],
  );
  return row?.status;
}

/** Eine Auswahl des Designsystems (Radix Select) öffnen und eine Option wählen. */
export async function choose(
  page: Page,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Karte der Anfrage im Verlauf. */
export function bookingCard(page: Page, requestId: string) {
  return page.locator(`[data-booking-card="${requestId}"]`);
}

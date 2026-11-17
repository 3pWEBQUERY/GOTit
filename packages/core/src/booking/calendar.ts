import { getDb } from "@app/db";
import type { AvailabilityInput } from "./availability";
import {
  blockSchema,
  settingsSchema,
  windowsSchema,
  type CalendarSettingsInput,
} from "./schemas";
import { DEFAULT_TIME_ZONE } from "./time-zone";

/**
 * Kalender des Anbieters (PRD v1 FR-BOOKING-001, v2 7.3
 * `/studio/kalender/verfuegbarkeit`): Einstellungen, wiederkehrende Fenster,
 * Abwesenheiten und Blocker. Alle Funktionen nehmen die Konto-ID und arbeiten
 * nur auf dem eigenen Profil.
 */
export const DEFAULT_SETTINGS: CalendarSettingsInput = {
  timeZone: DEFAULT_TIME_ZONE,
  bufferMinutes: 0,
  exclusiveBooking: true,
  requestTtlHours: 48,
  minNoticeHours: 2,
};

async function ownProfileId(userId: string): Promise<string | null> {
  const profile = await getDb().providerProfile.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  return profile && profile.status !== "ARCHIVED" ? profile.id : null;
}

export async function calendarSettings(
  providerProfileId: string,
): Promise<CalendarSettingsInput> {
  const row = await getDb().calendarSettings.findUnique({
    where: { providerProfileId },
  });
  return row
    ? {
        timeZone: row.timeZone,
        bufferMinutes: row.bufferMinutes,
        exclusiveBooking: row.exclusiveBooking,
        requestTtlHours: row.requestTtlHours,
        minNoticeHours: row.minNoticeHours,
      }
    : DEFAULT_SETTINGS;
}

export interface OwnCalendar {
  providerProfileId: string;
  settings: CalendarSettingsInput;
  windows: { weekday: number; startMinute: number; endMinute: number }[];
}

export async function getOwnCalendar(
  userId: string,
): Promise<OwnCalendar | null> {
  const providerProfileId = await ownProfileId(userId);
  if (!providerProfileId) return null;
  const [settings, windows] = await Promise.all([
    calendarSettings(providerProfileId),
    getDb().availabilityWindow.findMany({
      where: { providerProfileId },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
      select: { weekday: true, startMinute: true, endMinute: true },
    }),
  ]);
  return { providerProfileId, settings, windows };
}

export type CalendarWriteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "invalid" };

export async function saveCalendarSettings(
  userId: string,
  input: unknown,
): Promise<CalendarWriteResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const providerProfileId = await ownProfileId(userId);
  if (!providerProfileId) return { ok: false, reason: "not-found" };
  await getDb().calendarSettings.upsert({
    where: { providerProfileId },
    create: { providerProfileId, ...parsed.data },
    update: parsed.data,
  });
  return { ok: true };
}

/** Ersetzt alle Wochenfenster; Überschneidungen am selben Tag werden abgelehnt. */
export async function saveWeeklyWindows(
  userId: string,
  input: unknown,
): Promise<CalendarWriteResult> {
  const parsed = windowsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const providerProfileId = await ownProfileId(userId);
  if (!providerProfileId) return { ok: false, reason: "not-found" };
  const db = getDb();
  await db.$transaction([
    db.availabilityWindow.deleteMany({ where: { providerProfileId } }),
    db.availabilityWindow.createMany({
      data: parsed.data.map((window) => ({ providerProfileId, ...window })),
    }),
  ]);
  return { ok: true };
}

export async function addCalendarBlock(
  userId: string,
  input: unknown,
): Promise<
  { ok: true; id: string } | { ok: false; reason: "not-found" | "invalid" }
> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const providerProfileId = await ownProfileId(userId);
  if (!providerProfileId) return { ok: false, reason: "not-found" };
  const { note, ...rest } = parsed.data;
  const block = await getDb().calendarBlock.create({
    data: { providerProfileId, ...rest, note: note || null },
    select: { id: true },
  });
  return { ok: true, id: block.id };
}

export async function removeCalendarBlock(
  userId: string,
  blockId: string,
): Promise<boolean> {
  const providerProfileId = await ownProfileId(userId);
  if (!providerProfileId || blockId.length > 64) return false;
  const { count } = await getDb().calendarBlock.deleteMany({
    where: { id: blockId, providerProfileId },
  });
  return count > 0;
}

/**
 * Alles, was die Verfügbarkeit in einem Zeitraum bestimmt. Bestätigte Termine
 * zählen nur bei Exklusivbelegung; sonst bleibt die Zeit frei.
 */
export async function availabilityInput(
  providerProfileId: string,
  from: Date,
  to: Date,
): Promise<AvailabilityInput & { settings: CalendarSettingsInput }> {
  const db = getDb();
  const [settings, windows, blocks, bookings] = await Promise.all([
    calendarSettings(providerProfileId),
    db.availabilityWindow.findMany({
      where: { providerProfileId },
      select: { weekday: true, startMinute: true, endMinute: true },
    }),
    db.calendarBlock.findMany({
      where: { providerProfileId, endsAt: { gt: from }, startsAt: { lt: to } },
      select: { startsAt: true, endsAt: true },
    }),
    db.bookingRequest.findMany({
      where: {
        providerProfileId,
        status: "CONFIRMED",
        endsAt: { gt: from },
        startsAt: { lt: to },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return {
    settings,
    timeZone: settings.timeZone,
    windows,
    blocks: blocks.map((block) => ({
      start: block.startsAt,
      end: block.endsAt,
    })),
    bookings: settings.exclusiveBooking
      ? bookings.map((booking) => ({
          start: booking.startsAt,
          end: booking.endsAt,
        }))
      : [],
    bufferMinutes: settings.bufferMinutes,
  };
}

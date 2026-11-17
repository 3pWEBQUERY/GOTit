"use server";

import {
  addCalendarBlock,
  addDays,
  getOwnCalendar,
  removeCalendarBlock,
  saveCalendarSettings,
  saveWeeklyWindows,
  type CalendarSettingsInput,
} from "@app/core/booking";
import { revalidatePath } from "next/cache";
import { ownProviderUserId } from "../../../onboarding/actions/own-provider";
import {
  actOnBookingRequestAction,
  type BookingActionResult,
} from "../../actions/act";
import { isIsoDay } from "../lib/calendar-params";
import { localToUtc } from "../lib/calendar-model";

/**
 * Server Actions des Studio-Kalenders (Entscheid 0016, «Oberfläche Studio»).
 * Nur mit eigener Anbieterrolle; der Kern arbeitet nur auf dem eigenen
 * Profil. Ortszeiten kommen als Tag und `HH:MM` und werden hier mit der Zone
 * des Anbieters in UTC umgerechnet.
 */
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "failed" };

function done(ok: boolean): SaveResult {
  if (ok) revalidatePath("/", "layout");
  return ok ? { ok: true } : { ok: false, reason: "failed" };
}

export async function saveSettingsAction(
  input: CalendarSettingsInput,
): Promise<SaveResult> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, reason: "failed" };
  const result = await saveCalendarSettings(userId, input);
  if (!result.ok)
    return {
      ok: false,
      reason: result.reason === "invalid" ? "invalid" : "failed",
    };
  return done(true);
}

/** Schalter «Exklusivbelegung»: speichert sofort, die übrigen Einstellungen bleiben, wie sie gespeichert sind. */
export async function setExclusiveAction(
  exclusiveBooking: boolean,
): Promise<SaveResult> {
  const userId = await ownProviderUserId();
  if (!userId || typeof exclusiveBooking !== "boolean")
    return { ok: false, reason: "failed" };
  const own = await getOwnCalendar(userId);
  if (!own) return { ok: false, reason: "failed" };
  return done(
    (await saveCalendarSettings(userId, { ...own.settings, exclusiveBooking }))
      .ok,
  );
}

export async function saveWindowsAction(
  windows: { weekday: number; startMinute: number; endMinute: number }[],
): Promise<SaveResult> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, reason: "failed" };
  const result = await saveWeeklyWindows(userId, windows);
  if (!result.ok)
    return {
      ok: false,
      reason: result.reason === "invalid" ? "invalid" : "failed",
    };
  return done(true);
}

export interface BlockInput {
  kind: "ABSENCE" | "BLOCKER";
  startDay: string;
  /** Bei Abwesenheiten leer: ganze Tage. */
  startTime: string;
  endDay: string;
  endTime: string;
  note: string;
}

export type BlockField =
  | "startDay"
  | "startTime"
  | "endDay"
  | "endTime"
  | "note";
export type BlockResult =
  | { ok: true }
  | {
      ok: false;
      field?: BlockField;
      reason: "invalid" | "end-before-start" | "failed";
    };

export async function addBlockAction(input: BlockInput): Promise<BlockResult> {
  const userId = await ownProviderUserId();
  const own = userId ? await getOwnCalendar(userId) : null;
  if (!userId || !own) return { ok: false, reason: "failed" };
  if (input.kind !== "ABSENCE" && input.kind !== "BLOCKER")
    return { ok: false, reason: "invalid" };
  if (!isIsoDay(input.startDay))
    return { ok: false, field: "startDay", reason: "invalid" };
  if (!isIsoDay(input.endDay))
    return { ok: false, field: "endDay", reason: "invalid" };
  const zone = own.settings.timeZone;
  const whole = input.kind === "ABSENCE";
  const startsAt = localToUtc(
    input.startDay,
    whole ? "00:00" : input.startTime,
    zone,
  );
  if (!startsAt) return { ok: false, field: "startTime", reason: "invalid" };
  const endsAt = whole
    ? localToUtc(addDays(input.endDay, 1), "00:00", zone)
    : localToUtc(input.endDay, input.endTime, zone);
  if (!endsAt) return { ok: false, field: "endTime", reason: "invalid" };
  if (endsAt <= startsAt)
    return {
      ok: false,
      field: whole ? "endDay" : "endTime",
      reason: "end-before-start",
    };
  if (typeof input.note !== "string" || input.note.length > 1000)
    return { ok: false, field: "note", reason: "invalid" };
  const result = await addCalendarBlock(userId, {
    kind: input.kind,
    startsAt,
    endsAt,
    note: input.note,
  });
  if (!result.ok)
    return {
      ok: false,
      reason: result.reason === "invalid" ? "invalid" : "failed",
    };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeBlockAction(blockId: string): Promise<SaveResult> {
  const userId = await ownProviderUserId();
  if (!userId || typeof blockId !== "string")
    return { ok: false, reason: "failed" };
  return done(await removeCalendarBlock(userId, blockId));
}

export type CounterResult =
  | BookingActionResult
  | { ok: false; reason: "past"; field: "day" | "time" };

/** Gegenvorschlag mit Ortszeit des Anbieters; der Anbieter darf jede künftige Zeit vorschlagen (Entscheid 0016). */
export async function counterProposalAction(
  requestId: string,
  input: { day: string; time: string; durationMinutes: number },
): Promise<CounterResult> {
  const userId = await ownProviderUserId();
  const own = userId ? await getOwnCalendar(userId) : null;
  if (!own) return { ok: false, reason: "not-found" };
  if (!isIsoDay(input.day)) return { ok: false, reason: "invalid" };
  const startsAt = localToUtc(input.day, input.time, own.settings.timeZone);
  if (!startsAt) return { ok: false, reason: "invalid" };
  if (startsAt.getTime() <= Date.now())
    return { ok: false, reason: "past", field: "time" };
  return actOnBookingRequestAction(requestId, {
    action: "counter",
    startsAt: startsAt.toISOString(),
    durationMinutes: input.durationMinutes,
  });
}

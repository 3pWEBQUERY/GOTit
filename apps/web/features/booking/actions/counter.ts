"use server";

import { getRequestDetail, zonedToUtc } from "@app/core/booking";
import { DEFAULT_LOCALE } from "@app/core/locale";
import { actOnBookingRequestAction, type BookingActionResult } from "./act";
import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Gegenvorschlag des Anbieters mit Tag und Uhrzeit in seiner eigenen Zone
 * (Entscheid 0016: auch ausserhalb seines Kalenders). Die Umrechnung nach UTC
 * geschieht hier, mit der Zone aus seinen Einstellungen; Berechtigung und
 * Übergang prüft der Kern in `actOnBookingRequestAction`.
 */
export async function counterAtLocalTimeAction(
  requestId: unknown,
  input: unknown,
): Promise<BookingActionResult> {
  if (
    typeof requestId !== "string" ||
    typeof input !== "object" ||
    input === null
  )
    return { ok: false, reason: "invalid" };
  const { day, time, durationMinutes } = input as Record<string, unknown>;
  if (
    typeof day !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    return { ok: false, reason: "invalid" };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const detail = await getRequestDetail(
    viewer.userId,
    requestId,
    DEFAULT_LOCALE,
  );
  if (!detail) return { ok: false, reason: "not-found" };
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  const startsAt = zonedToUtc(day, hours * 60 + minutes, detail.timeZone);
  return actOnBookingRequestAction(requestId, {
    action: "counter",
    startsAt: startsAt.toISOString(),
    durationMinutes,
  });
}

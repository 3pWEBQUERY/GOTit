"use server";

import { actOnBookingRequest, createBookingRequest, setProviderNote, type ActResult, type CreateRequestResult } from "@app/core/booking";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";

export type BookingActionResult = ActResult | { ok: false; reason: "sign-in" | "rate-limited" };
export type BookingCreateResult = CreateRequestResult | { ok: false; reason: "sign-in" | "rate-limited" };

/**
 * Gemeinsame Server Actions für Terminanfragen (Schritt 1.9, Entscheid 0016).
 * Die Berechtigung prüft der Kern: nur Beteiligte, nur erlaubte Übergänge.
 * Mitgliederbereich, Studio und die Karte im Thread nutzen dieselben Aktionen.
 */
export async function createBookingRequestAction(profileSlug: unknown, input: unknown): Promise<BookingCreateResult> {
  if (typeof profileSlug !== "string") return { ok: false, reason: "invalid" };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit("bookingRequest", rateLimitSubject(viewer.userId));
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  const result = await createBookingRequest(viewer, profileSlug, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function actOnBookingRequestAction(requestId: unknown, input: unknown): Promise<BookingActionResult> {
  if (typeof requestId !== "string") return { ok: false, reason: "not-found" };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit("bookingAction", rateLimitSubject(viewer.userId));
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  const result = await actOnBookingRequest(viewer, requestId, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setProviderNoteAction(requestId: unknown, note: unknown): Promise<{ ok: boolean }> {
  if (typeof requestId !== "string" || typeof note !== "string") return { ok: false };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false };
  return { ok: await setProviderNote(viewer.userId, requestId, note) };
}

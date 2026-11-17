"use server";

import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { appealReview, createReview, respondToReview, type CreateReviewResult } from "@app/core/review";
import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";

type Guarded<T> = T | { ok: false; reason: "sign-in" | "rate-limited" };

/**
 * Gemeinsame Server Actions der Bewertungen (Schritt 1.10, Entscheid 0017).
 * Berechtigung und Termin prüft der Kern; die Datenbank prüft den Termin
 * zusätzlich per Trigger.
 */
async function guard(): Promise<{ userId: string } | { ok: false; reason: "sign-in" | "rate-limited" }> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit("review", rateLimitSubject(viewer.userId));
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  return { userId: viewer.userId };
}

export async function createReviewAction(bookingRequestId: unknown, input: unknown): Promise<Guarded<CreateReviewResult>> {
  if (typeof bookingRequestId !== "string") return { ok: false, reason: "not-found" };
  const viewer = await getViewer();
  const allowed = await guard();
  if ("ok" in allowed) return allowed;
  const result = await createReview(viewer, bookingRequestId, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function respondToReviewAction(reviewId: unknown, text: unknown) {
  if (typeof reviewId !== "string") return { ok: false as const, reason: "not-found" as const };
  const allowed = await guard();
  if ("ok" in allowed) return allowed;
  const result = await respondToReview(allowed.userId, reviewId, text);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function appealReviewAction(reviewId: unknown, reason: unknown) {
  if (typeof reviewId !== "string") return { ok: false as const, reason: "not-found" as const };
  const allowed = await guard();
  if ("ok" in allowed) return allowed;
  const result = await appealReview(allowed.userId, reviewId, reason);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

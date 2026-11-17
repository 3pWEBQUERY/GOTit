"use server";

import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { reportReview } from "@app/core/review";
import { getViewer } from "../../shell/queries/get-viewer";

export type ReportReviewResult =
  | { ok: true }
  | { ok: false; reason: "sign-in" | "rate-limited" | "invalid" | "not-found" };

/**
 * Bewertung melden (v2 10.1, Entscheid 0017): jedes angemeldete Konto, mit
 * der Grenze der Meldungen pro Konto. Ob die Bewertung veröffentlicht ist,
 * prüft der Kern; die Kopie des Texts hängt am Fall.
 */
export async function reportReviewAction(
  reviewId: unknown,
  input: unknown,
): Promise<ReportReviewResult> {
  if (typeof reviewId !== "string") return { ok: false, reason: "not-found" };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit(
    "report",
    rateLimitSubject(viewer.userId),
  );
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  const result = await reportReview(viewer.userId, reviewId, input);
  return result.ok ? { ok: true } : result;
}

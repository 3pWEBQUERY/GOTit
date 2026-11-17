"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { MODERATION_ROLES } from "@app/core/moderation";
import { dismissAppeal, moderateReview } from "@app/core/review";
import { APPEAL_MAX, moderationSchema } from "@app/core/review/schemas";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";
import { reasonError } from "../lib/form";
import { nextReviewCase } from "../queries/admin";

/** Fehler als Schlüssel unter `reviews.admin.errors`. */
async function moderator(): Promise<
  { ok: true; userId: string } | { ok: false; formError: string }
> {
  const viewer = await getViewer();
  if (viewer.kind !== "account")
    return { ok: false, formError: "signInRequired" };
  const access = adminAccess(
    await loadAdminActor(viewer.userId),
    MODERATION_ROLES,
  );
  if (!access.allowed) return { ok: false, formError: "forbidden" };
  return { ok: true, userId: viewer.userId };
}

function decisionFieldErrors(input: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const decision = moderationSchema.shape.decision.safeParse(input.decision);
  if (!decision.success) errors.decision = "decisionRequired";
  const reason =
    typeof input.reason === "string"
      ? reasonError(input.reason, 1000)
      : "reasonTooShort";
  if (reason) errors.reason = reason;
  if (!moderationSchema.shape.rule.safeParse(input.rule).success)
    errors.rule = "ruleRequired";
  return errors;
}

/**
 * Entscheid über eine Bewertung (v2 12.4, Entscheid 0017): prüft den Zugang
 * selbst; der Kern prüft die Rolle erneut und entscheidet atomar nur aus dem
 * Status, den die Moderation gesehen hat. Zwei gleichzeitige Entscheide
 * ergeben einen Gewinner, der zweite erhält `alreadyDecided`.
 */
export async function moderateReviewAction(
  input: unknown,
): Promise<ActionResult<{ nextId: string | null }>> {
  const guard = await moderator();
  if (!guard.ok) return guard;
  if (typeof input !== "object" || input === null)
    return { ok: false, formError: "generic" };
  const { reviewId, ...data } = input as Record<string, unknown>;
  if (typeof reviewId !== "string" || reviewId.length > 64)
    return { ok: false, formError: "notFound" };
  const fieldErrors = decisionFieldErrors(data);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  const result = await moderateReview(guard.userId, reviewId, data);
  if (!result.ok)
    return {
      ok: false,
      formError: result.reason === "invalid" ? "generic" : "alreadyDecided",
    };
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { nextId: await nextReviewCase(guard.userId, reviewId) },
  };
}

/** Einspruch abweisen: Die Bewertung bleibt, wie sie ist; der Grund steht im Audit-Log. */
export async function dismissAppealAction(
  appealId: unknown,
  reason: unknown,
): Promise<ActionResult> {
  const guard = await moderator();
  if (!guard.ok) return guard;
  if (typeof appealId !== "string" || appealId.length > 64)
    return { ok: false, formError: "notFound" };
  const text = typeof reason === "string" ? reason : "";
  const error = reasonError(text, APPEAL_MAX);
  if (error) return { ok: false, fieldErrors: { reason: error } };
  const ok = await dismissAppeal(guard.userId, appealId, text);
  if (!ok) return { ok: false, formError: "appealClosed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

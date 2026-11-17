"use server";

import { appealCase, appealRestriction, appealableCaseFor } from "@app/core/moderation";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

/** Fehler als Schlüssel unter `moderation.member.appeal.errors`. */
const MIN = 20;
const MAX = 2000;

function reasonError(reason: unknown): string | null {
  if (typeof reason !== "string") return "tooShort";
  const length = reason.trim().length;
  if (length < MIN) return "tooShort";
  if (length > MAX) return "tooLong";
  return null;
}

async function account(): Promise<{ ok: true; userId: string } | { ok: false; formError: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "generic" };
  // Gleiche Grenze wie Meldungen: ein Einspruch ist selten, eine Flut ist Missbrauch.
  const limit = await consumeRateLimit("report", rateLimitSubject(viewer.userId));
  if (!limit.allowed) return { ok: false, formError: "rateLimited" };
  return { ok: true, userId: viewer.userId };
}

/** Einspruch gegen eine eigene Einschränkung (v1 9.2), einmal pro Einschränkung. */
export async function appealRestrictionAction(restrictionId: unknown, reason: unknown): Promise<ActionResult> {
  const error = reasonError(reason);
  if (error) return { ok: false, fieldErrors: { reason: error } };
  if (typeof restrictionId !== "string") return { ok: false, formError: "notFound" };
  const guard = await account();
  if (!guard.ok) return guard;
  const result = await appealRestriction(guard.userId, restrictionId, String(reason));
  if (!result.ok) return { ok: false, formError: result.reason === "already" ? "already" : result.reason === "invalid" ? "generic" : "notFound" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Einspruch gegen den Entscheid zu einem eigenen Medium (v2 12.4). Den Fall
 * sucht der Server selbst; der Browser nennt nur das Medium.
 */
export async function appealMediaCaseAction(mediaId: unknown, reason: unknown): Promise<ActionResult> {
  const error = reasonError(reason);
  if (error) return { ok: false, fieldErrors: { reason: error } };
  if (typeof mediaId !== "string") return { ok: false, formError: "notFound" };
  const guard = await account();
  if (!guard.ok) return guard;
  const found = await appealableCaseFor(guard.userId, "MEDIA", mediaId);
  if (!found) return { ok: false, formError: "notFound" };
  if (!found.canAppeal) return { ok: false, formError: "already" };
  const result = await appealCase(guard.userId, found.reportId, String(reason));
  if (!result.ok) return { ok: false, formError: result.reason === "already-decided" ? "already" : "notFound" };
  revalidatePath("/", "layout");
  return { ok: true };
}

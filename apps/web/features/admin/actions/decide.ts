"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { REVIEWER_ROLES, decideReview } from "@app/core/verification";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";
import { getNextOpenCaseId } from "../queries/get-queue";
import { decisionFieldErrors } from "./decision-errors";
import { isRecordNotFound } from "./record-not-found";

const idSchema = z.object({ reviewId: z.string().min(1).max(64) });

async function reviewerId(): Promise<{ ok: true; userId: string } | { ok: false; formError: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  if (!adminAccess(await loadAdminActor(viewer.userId), REVIEWER_ROLES).allowed) return { ok: false, formError: "forbidden" };
  return { ok: true, userId: viewer.userId };
}

function decisionInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const { reviewId: _reviewId, ...rest } = input as Record<string, unknown>;
  return rest;
}

/** Prüft die Eingaben beim Verlassen eines Felds; speichert nichts. */
export async function checkDecision(input: unknown): Promise<Record<string, string>> {
  const access = await reviewerId();
  if (!access.ok) return {};
  return decisionFieldErrors(decisionInput(input));
}

/**
 * Speichert den Entscheid über einen Fall (PRD 12.4). Prüft den Zugang erneut,
 * Begründung und Regel sind Pflicht. Liefert den nächsten offenen Fall, damit
 * die Oberfläche dorthin wechseln kann.
 */
export async function decideCase(input: unknown): Promise<ActionResult<{ nextId: string | null }>> {
  const access = await reviewerId();
  if (!access.ok) return { ok: false, formError: access.formError };
  const ids = idSchema.safeParse(input);
  if (!ids.success) return { ok: false, formError: "notFound" };
  const data = decisionInput(input);
  const fieldErrors = decisionFieldErrors(data);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  try {
    const result = await decideReview(access.userId, ids.data.reviewId, data);
    if (!result.ok) {
      const formError = { "not-open": "alreadyDecided", "identity-invalid": "identityInvalid", "invalid-decision": "decisionNotAllowed" } as const;
      return { ok: false, formError: formError[result.reason] };
    }
  } catch (error) {
    if (isRecordNotFound(error)) return { ok: false, formError: "notFound" };
    throw error;
  }
  return { ok: true, data: { nextId: await getNextOpenCaseId(ids.data.reviewId) } };
}

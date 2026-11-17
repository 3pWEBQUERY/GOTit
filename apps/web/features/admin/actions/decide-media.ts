"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { decideMedia, mediaIdSchema, nextMediaInReview } from "@app/core/media";
import { REVIEWER_ROLES } from "@app/core/verification";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";
import { mediaDecisionErrors } from "../media/decision-errors";

/**
 * Entscheid über ein Medium (PRD v2 12.4, 14.3). Prüft den Zugang selbst; der
 * Kern prüft die Rolle erneut und entscheidet atomar nur aus «In Prüfung».
 */
export async function decideMediaCase(input: unknown): Promise<ActionResult<{ nextId: string | null }>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  if (!adminAccess(await loadAdminActor(viewer.userId), REVIEWER_ROLES).allowed) return { ok: false, formError: "forbidden" };
  const ids = z.object({ mediaId: mediaIdSchema }).safeParse(input);
  if (!ids.success) return { ok: false, formError: "notFound" };
  const { mediaId: _mediaId, ...data } = input as Record<string, unknown>;
  const fieldErrors = mediaDecisionErrors(data);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  const result = await decideMedia(viewer.userId, ids.data.mediaId, data);
  if (!result.ok) return { ok: false, formError: "mediaAlreadyDecided" };
  return { ok: true, data: { nextId: await nextMediaInReview(viewer.userId, ids.data.mediaId) } };
}

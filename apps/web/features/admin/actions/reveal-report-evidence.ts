"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { MODERATION_ROLES, revealReportEvidence } from "@app/core/moderation";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

export interface EvidenceMessage {
  id: string;
  sentAt: string;
  /** null: vor der Meldung gelöscht oder nur ein Bild. */
  body: string | null;
}

const schema = z.object({
  reportId: z.string().min(1).max(64),
  reason: z.string().trim().min(10, "revealReasonTooShort").max(500, "revealReasonTooLong"),
});

/**
 * Deckt die Kopie der gemeldeten Nachrichten auf (PRD v2 12.4, 16.2). Prüft
 * den Zugang selbst; der Kern schreibt den Audit-Eintrag mit dem Grund.
 */
export async function revealEvidence(input: unknown): Promise<ActionResult<{ messages: EvidenceMessage[] }>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  if (!adminAccess(await loadAdminActor(viewer.userId), MODERATION_ROLES).allowed) return { ok: false, formError: "reportForbidden" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues.find((entry) => entry.path[0] === "reason");
    return issue ? { ok: false, fieldErrors: { reason: issue.message } } : { ok: false, formError: "notFound" };
  }
  const evidence = await revealReportEvidence(viewer.userId, parsed.data.reportId, parsed.data.reason);
  if (!evidence) return { ok: false, formError: "notFound" };
  const messages =
    evidence.kind === "message"
      ? [{ id: parsed.data.reportId, sentAt: evidence.sentAt.toISOString(), body: evidence.body }]
      : evidence.kind === "conversation"
        ? evidence.messages
            .map((entry) => ({ id: entry.id, sentAt: entry.sentAt.toISOString(), body: entry.body }))
            .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
        : [];
  return { ok: true, data: { messages } };
}

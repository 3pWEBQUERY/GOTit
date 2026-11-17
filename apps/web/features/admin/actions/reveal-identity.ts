"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { REVIEWER_ROLES, isIdentityValid, revealIdentityDetails } from "@app/core/verification";
import type { IdentityCheckStatus } from "@app/db";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";
import { isRecordNotFound } from "./record-not-found";

export interface IdentityDetails {
  status: IdentityCheckStatus;
  provider: string;
  ageOver18: boolean | null;
  livenessPassed: boolean | null;
  checkedAt: string | null;
  expiresAt: string | null;
  failureReason: string | null;
  /** Gilt die Prüfung jetzt (volljährig, lebendig, nicht abgelaufen)? */
  valid: boolean;
}

const schema = z.object({ reviewId: z.string().min(1).max(64), reason: z.string().trim().min(10, "revealReasonTooShort").max(500, "revealReasonTooLong") });

/**
 * Deckt die Prüfdetails eines Falls auf (PRD 12.4). Prüft den Zugang selbst,
 * nicht nur das Layout; das Aufdecken schreibt einen Audit-Eintrag mit Grund.
 */
export async function revealIdentity(input: unknown): Promise<ActionResult<{ details: IdentityDetails | null }>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  if (!adminAccess(await loadAdminActor(viewer.userId), REVIEWER_ROLES).allowed) return { ok: false, formError: "forbidden" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues.find((entry) => entry.path[0] === "reason");
    return issue ? { ok: false, fieldErrors: { reason: issue.message } } : { ok: false, formError: "notFound" };
  }
  try {
    const check = await revealIdentityDetails(viewer.userId, parsed.data.reviewId, parsed.data.reason);
    return {
      ok: true,
      data: {
        details: check
          ? {
              status: check.status,
              provider: check.provider,
              ageOver18: check.ageOver18,
              livenessPassed: check.livenessPassed,
              checkedAt: check.checkedAt?.toISOString() ?? null,
              expiresAt: check.expiresAt?.toISOString() ?? null,
              failureReason: check.failureReason,
              valid: isIdentityValid(check),
            }
          : null,
      },
    };
  } catch (error) {
    if (isRecordNotFound(error)) return { ok: false, formError: "notFound" };
    throw error;
  }
}

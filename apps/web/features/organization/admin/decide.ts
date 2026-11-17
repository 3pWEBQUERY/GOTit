"use server";

import { adminAccess, loadAdminActor } from "@app/core/admin";
import { MODERATION_ROLES } from "@app/core/moderation";
import { decideOrganizationVerification } from "@app/core/organization";
import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";
import { nextOrganizationCase } from "./queries";

const DECISIONS = ["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;

export type DecideResult =
  | { ok: true; nextId: string | null }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

/**
 * Entscheid über die Nachweise einer Organisation (v1 FR-VERIFY-003
 * «Dokumentierte Freigabe»). Prüft den Zugang selbst; der Kern prüft die Rolle
 * erneut und entscheidet atomar nur aus «Eingereicht».
 */
export async function decideOrganizationAction(
  id: string,
  input: { decision?: string; reason?: string },
): Promise<DecideResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "account")
    return { ok: false, formError: "signInRequired" };
  if (
    !adminAccess(await loadAdminActor(viewer.userId), MODERATION_ROLES).allowed
  )
    return { ok: false, formError: "forbidden" };
  const fieldErrors: Record<string, string> = {};
  if (!DECISIONS.includes(input.decision as (typeof DECISIONS)[number]))
    fieldErrors.decision = "decisionRequired";
  const reason = (input.reason ?? "").trim();
  if (reason.length < 10) fieldErrors.reason = "reasonTooShort";
  else if (reason.length > 1000) fieldErrors.reason = "reasonTooLong";
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  const result = await decideOrganizationVerification(viewer.userId, id, {
    decision: input.decision,
    reason,
  });
  if (!result.ok)
    return {
      ok: false,
      formError: result.reason === "not-open" ? "alreadyDecided" : "generic",
    };
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, nextId: await nextOrganizationCase(viewer.userId, id) };
}

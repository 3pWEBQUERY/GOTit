"use server";

import { markRegionChecked, setRegionApproved, updateRegionRules, type RegionAdminResult } from "@app/core/geo/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { adminAction, reasonError, text } from "../areas/run-action";

/** Server Actions der Regionen (v1 9.5). Recht `regions.manage` prüft der Kern. */
const ERRORS: Record<Extract<RegionAdminResult, { ok: false }>["reason"], string> = {
  invalid: "invalid",
  "not-found": "notFound",
  "not-checked": "regionNotChecked",
  "parent-not-approved": "regionParentNotApproved",
};

function done(result: RegionAdminResult): ActionResult {
  if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateRegionRulesAction(regionId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const errors: Record<string, string> = {};
    const fields = ["legalNote", "requiredPermits", "contentRestrictions"] as const;
    for (const field of fields) if (text(values, field).trim().length > 2000) errors[field] = "tooLong";
    const rankText = text(values, "featuredRank").trim();
    const rank = rankText ? Number(rankText) : null;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 999)) errors.featuredRank = "rankInvalid";
    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    return done(
      await updateRegionRules(actorId, regionId, {
        legalNote: text(values, "legalNote"),
        requiredPermits: text(values, "requiredPermits"),
        contentRestrictions: text(values, "contentRestrictions"),
        featuredRank: rank,
      }),
    );
  });
}

export async function markRegionCheckedAction(regionId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const note = text(values, "note");
    const problem = reasonError(note, 10, 1000);
    if (problem) return { ok: false, fieldErrors: { note: problem } };
    return done(await markRegionChecked(actorId, regionId, note));
  });
}

export async function setRegionApprovedAction(regionId: string, approved: boolean, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const reason = text(values, "reason");
    const problem = reasonError(reason, 10, 500);
    if (problem) return { ok: false, fieldErrors: { reason: problem } };
    return done(await setRegionApproved(actorId, regionId, approved, reason));
  });
}

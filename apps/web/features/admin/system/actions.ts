"use server";

import { setFeatureFlag, type SetFlagResult } from "@app/core/admin/system";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { adminAction, flag, list, reasonError, text } from "../areas/run-action";

/** Feature Flags schalten (v2 7.8 `/admin/system/flags`). Recht `flags.manage` prüft der Kern. */
const ERRORS: Record<Extract<SetFlagResult, { ok: false }>["reason"], string> = { invalid: "invalid", "unknown-key": "notFound", "unknown-region": "unknownRegion" };

export async function setFlagAction(key: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const reason = text(values, "reason");
    const problem = reasonError(reason, 10, 500);
    if (problem) return { ok: false, fieldErrors: { reason: problem } };
    const result = await setFeatureFlag(actorId, key, { enabled: flag(values, "enabled"), disabledRegions: list(values, "disabledRegions") }, reason);
    if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

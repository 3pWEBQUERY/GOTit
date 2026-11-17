"use server";

import { submitProfile } from "@app/core/onboarding";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { ownProviderUserId } from "./own-provider";

/** Reicht das eigene Profil zur manuellen Prüfung ein (PRD 16.1). Fehlt etwas, nennt die Antwort die Schritte. */
export async function submitProfileAction(): Promise<ActionResult<{ missing: string[] }>> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  const result = await submitProfile(userId);
  if (!result.ok && result.missing.length === 0) return { ok: false, formError: "notEditable" };
  if (!result.ok)
    return {
      ok: false,
      formError: "incomplete",
      fieldErrors: Object.fromEntries(result.missing.map((step) => [step, "missing"])),
    };
  revalidatePath("/", "layout");
  return { ok: true };
}

"use server";

import { submitProfile, submitSchema } from "@app/core/onboarding";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { ownProviderUserId } from "./own-provider";

/**
 * Reicht das eigene Profil zur manuellen Prüfung ein (PRD 16.1). Verlangt die
 * ausdrückliche Zustimmung zur Veröffentlichung (PRD v1 FR-VERIFY-002). Fehlt
 * etwas, nennt die Antwort die Schritte.
 */
export async function submitProfileAction(input: unknown): Promise<ActionResult<{ missing: string[] }>> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  if (!submitSchema.safeParse(input).success) return { ok: false, fieldErrors: { publicationConsent: "publicationConsentRequired" } };
  const result = await submitProfile(userId, input);
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

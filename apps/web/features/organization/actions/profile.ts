"use server";

import {
  saveOrganizationProfile,
  submitVerification,
} from "@app/core/organization";
import {
  organizationProfileSchema,
  verificationSchema,
} from "@app/core/organization/schemas";
import {
  actorId,
  issuesToFields,
  reasonKey,
  refreshOrganization,
  type OrganizationActionResult,
} from "./guard";

/** Unternehmensprofil speichern (v1 FR-BUSINESS-001); Fehler am Feld wie im Kern. */
export async function saveProfileAction(
  slug: string,
  input: unknown,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const parsed = organizationProfileSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: issuesToFields(parsed.error.issues) };
  const result = await saveOrganizationProfile(userId, slug, input);
  if (!result.ok) return { ok: false, formError: reasonKey(result.reason) };
  refreshOrganization();
  return { ok: true };
}

/** Nachweise einreichen (v1 FR-VERIFY-003); eine offene Einreichung bleibt die einzige. */
export async function submitVerificationAction(
  slug: string,
  input: unknown,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: issuesToFields(parsed.error.issues) };
  const result = await submitVerification(userId, slug, input);
  if (!result.ok) return { ok: false, formError: reasonKey(result.reason) };
  refreshOrganization();
  return { ok: true };
}

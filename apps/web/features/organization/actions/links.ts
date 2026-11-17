"use server";

import { endLink, inviteProvider } from "@app/core/organization";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { inviteSchema } from "@app/core/organization/schemas";
import {
  actorId,
  issuesToFields,
  reasonKey,
  refreshOrganization,
  type OrganizationActionResult,
} from "./guard";

/** Einladung an einen Anbieter (v1 FR-BUSINESS-003); aktiv wird sie erst mit seiner Zustimmung. */
export async function inviteProviderAction(
  slug: string,
  input: unknown,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const limit = await consumeRateLimit("organizationInvite", rateLimitSubject(userId));
  if (!limit.allowed) return { ok: false, formError: "rateLimited" };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: issuesToFields(parsed.error.issues) };
  const result = await inviteProvider(userId, slug, input);
  if (!result.ok) {
    if (
      result.reason === "provider-unavailable" ||
      result.reason === "already-linked"
    )
      return {
        ok: false,
        fieldErrors: { providerSlug: reasonKey(result.reason) },
      };
    return { ok: false, formError: reasonKey(result.reason) };
  }
  refreshOrganization();
  return { ok: true };
}

/** Verknüpfung lösen; das Anbieterkonto bleibt bestehen (v1 FR-BUSINESS-005). */
export async function endLinkAction(
  linkId: string,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId || !(await endLink(userId, linkId)))
    return { ok: false, formError: "generic" };
  refreshOrganization();
  return { ok: true };
}

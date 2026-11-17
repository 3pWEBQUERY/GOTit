"use server";

import {
  deleteLocation,
  deleteOpeningException,
  saveLocation,
  saveOpeningException,
  saveOpeningHours,
} from "@app/core/organization";
import {
  locationSchema,
  openingExceptionSchema,
} from "@app/core/organization/schemas";
import {
  actorId,
  issuesToFields,
  reasonKey,
  refreshOrganization,
  type OrganizationActionResult,
} from "./guard";

/** Standort anlegen (`locationId` null) oder ändern; gibt die ID zurück. */
export async function saveLocationAction(
  slug: string,
  locationId: string | null,
  input: unknown,
): Promise<OrganizationActionResult<{ id: string }>> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: issuesToFields(parsed.error.issues) };
  const result = await saveLocation(userId, slug, locationId, input);
  if (!result.ok)
    return result.reason === "invalid"
      ? { ok: false, fieldErrors: { regionId: "region" } }
      : { ok: false, formError: reasonKey(result.reason) };
  refreshOrganization();
  return { ok: true, data: { id: result.id } };
}

export async function deleteLocationAction(
  slug: string,
  locationId: string,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId || !(await deleteLocation(userId, slug, locationId)))
    return { ok: false, formError: "generic" };
  refreshOrganization();
  return { ok: true };
}

/** Ersetzt die Öffnungszeiten; Überschneidungen lehnt der Kern ab. */
export async function saveHoursAction(
  slug: string,
  locationId: string,
  hours: unknown,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const result = await saveOpeningHours(userId, slug, locationId, hours);
  if (!result.ok) return { ok: false, formError: reasonKey(result.reason) };
  refreshOrganization();
  return { ok: true };
}

/** Ausnahme an einem Tag; ein zweiter Eintrag für denselben Tag ersetzt den ersten. */
export async function saveExceptionAction(
  slug: string,
  locationId: string,
  input: unknown,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  const parsed = openingExceptionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fieldErrors: issuesToFields(parsed.error.issues) };
  const result = await saveOpeningException(userId, slug, locationId, input);
  if (!result.ok) return { ok: false, formError: reasonKey(result.reason) };
  refreshOrganization();
  return { ok: true };
}

export async function deleteExceptionAction(
  slug: string,
  exceptionId: string,
): Promise<OrganizationActionResult> {
  const userId = await actorId();
  if (!userId || !(await deleteOpeningException(userId, slug, exceptionId)))
    return { ok: false, formError: "generic" };
  refreshOrganization();
  return { ok: true };
}

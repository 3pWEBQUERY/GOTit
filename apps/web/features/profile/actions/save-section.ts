"use server";

import { SECTION_SCHEMAS, isProfileSection, saveProfileSection, type CriticalField } from "@app/core/provider-profile";
import { revalidatePath } from "next/cache";
import { fieldErrorsFromZod, type ActionResult } from "../../account/action-result";
import { ownProviderUserId } from "../../onboarding/actions/own-provider";

export interface SaveSectionData {
  /** Felder, die jetzt auf die Prüfung warten. */
  pending: CriticalField[];
}

/**
 * Speichert einen Abschnitt des eigenen Profils (PRD v2 11.2). Autorisierung
 * auf Objektebene: angemeldet, mit eigener Anbieterrolle, und der Kern
 * schreibt nur das Profil dieses Kontos. Die Eingabe wird mit demselben Schema
 * wie im Formular geprüft.
 */
export async function saveProfileSectionAction(section: unknown, input: unknown): Promise<ActionResult<SaveSectionData>> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  if (!isProfileSection(section)) return { ok: false, formError: "generic" };
  const parsed = SECTION_SCHEMAS[section].safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const result = await saveProfileSection(userId, section, parsed.data);
  if (!result.ok) {
    if (result.reason === "invalid-region") return { ok: false, fieldErrors: { regionIds: "invalidRegion" } };
    if (result.reason === "invalid-category") return { ok: false, fieldErrors: { categoryIds: "invalidCategory" } };
    return { ok: false, formError: result.reason === "locked" ? "locked" : "notAllowed" };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { pending: result.pending } };
}

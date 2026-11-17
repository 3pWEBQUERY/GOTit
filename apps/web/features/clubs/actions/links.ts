"use server";

import { endLink, respondToInvitation } from "@app/core/organization";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

/** Fehler als Schlüssel unter `clubs.studio.errors`. */
async function providerUserId(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer.kind === "account" && viewer.provider ? viewer.userId : null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

/**
 * Einladung annehmen oder ablehnen (v1 FR-BUSINESS-003, v2 7.6). Der Kern
 * prüft, dass die Einladung dem eigenen Profil gilt und noch offen ist.
 */
export async function respondToInvitationAction(
  linkId: unknown,
  accept: unknown,
): Promise<ActionResult> {
  const userId = await providerUserId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  if (!validId(linkId) || typeof accept !== "boolean")
    return { ok: false, formError: "notFound" };
  if (!(await respondToInvitation(userId, linkId, accept)))
    return { ok: false, formError: "notOpen" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Verknüpfung lösen (v1 FR-BUSINESS-005): Konto und Profil des Anbieters bleiben bestehen. */
export async function endLinkAction(linkId: unknown): Promise<ActionResult> {
  const userId = await providerUserId();
  if (!userId) return { ok: false, formError: "signInRequired" };
  if (!validId(linkId)) return { ok: false, formError: "notFound" };
  if (!(await endLink(userId, linkId)))
    return { ok: false, formError: "notOpen" };
  revalidatePath("/", "layout");
  return { ok: true };
}

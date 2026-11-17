import { adminAccess, loadAdminActor, type AdminAccess, type AdminActor } from "@app/core/admin";
import { MODERATION_ROLES } from "@app/core/moderation";
import { REVIEWER_ROLES } from "@app/core/verification";
import { cache } from "react";
import { getViewer } from "../shell/queries/get-viewer";

export interface AdminContext {
  /** null: nicht angemeldet. */
  actor: AdminActor | null;
  signedIn: boolean;
  name: string;
}

/** Wer die Admin-Anwendung öffnet; einmal pro Anfrage geladen. */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { actor: null, signedIn: false, name: "" };
  return { actor: await loadAdminActor(viewer.userId), signedIn: true, name: viewer.name };
});

/** Zugang zum Bereich Verifizierungen (PRD 7.8): interne Rolle, 2FA und eine Prüfrolle. */
export async function reviewerAccess(): Promise<{ access: AdminAccess; actor: AdminActor | null }> {
  const { actor } = await getAdminContext();
  return { access: adminAccess(actor, REVIEWER_ROLES), actor };
}

/** Ob die Person Profile prüfen darf; für Links und Zähler in Shell und Übersicht. */
export function canReview(actor: AdminActor | null): boolean {
  return adminAccess(actor, REVIEWER_ROLES).allowed;
}

/** Zugang zum Bereich Meldungen (v1 20.4, v2 12.4): Moderation, Trust & Safety, Plattform-Administration; nicht Support. */
export async function moderationAccess(): Promise<{ access: AdminAccess; actor: AdminActor | null }> {
  const { actor } = await getAdminContext();
  return { access: adminAccess(actor, MODERATION_ROLES), actor };
}

/** Ob die Person Meldungen sehen darf; für den Zähler in der Seitenleiste. */
export function canModerate(actor: AdminActor | null): boolean {
  return adminAccess(actor, MODERATION_ROLES).allowed;
}

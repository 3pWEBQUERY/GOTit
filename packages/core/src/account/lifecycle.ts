import { randomBytes } from "node:crypto";
import { getDb } from "@app/db";
import { draftSlug } from "./policy";
import type { AccountTypeInput, OrganizationKindInput } from "./schemas";
import { requestSearchReindexForUser } from "../search/reindex";

/**
 * Legt nach der Registrierung an, was der Kontotyp braucht: ein Anbieterprofil
 * im Entwurf oder eine Organisation im Entwurf mit dem Konto als Inhaber.
 * Öffentlich wird davon nichts ohne Prüfung und Freigabe (PRD 16.1).
 */
export async function provisionAccountType(userId: string, type: AccountTypeInput, names: { name: string; organizationName?: string | undefined; organizationKind?: OrganizationKindInput | undefined }): Promise<void> {
  const db = getDb();
  const suffix = randomBytes(3).toString("hex");
  await db.user.update({ where: { id: userId }, data: { accountType: type, ageConfirmedAt: new Date() } });
  if (type === "PROVIDER") {
    await db.providerProfile.create({ data: { userId, slug: draftSlug(names.name, suffix), displayName: names.name, status: "DRAFT" } });
  }
  if (type === "ORGANIZATION" && names.organizationName) {
    await db.organization.create({
      data: {
        slug: draftSlug(names.organizationName, suffix),
        name: names.organizationName,
        kind: names.organizationKind ?? "CLUB",
        status: "DRAFT",
        members: { create: { userId, role: "OWNER" } },
      },
    });
  }
}

/**
 * Deaktivieren: ein öffentliches Profil wird pausiert. Eine neue Anmeldung hebt
 * das auf. Die Sitzungen beendet der Aufrufer über die Auth-API, weil sie auch
 * im Redis-Zweitspeicher liegen.
 */
export async function deactivateOwnAccount(userId: string): Promise<void> {
  const db = getDb();
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { deactivatedAt: new Date() } }),
    db.providerProfile.updateMany({ where: { userId, status: "PUBLISHED" }, data: { status: "PAUSED" } }),
  ]);
  await requestSearchReindexForUser(userId);
}

/** Löschung beantragen: wie Deaktivieren, dazu der Zeitpunkt, ab dem der `cron`-Dienst endgültig löscht. Sitzungen beendet der Aufrufer. */
export async function requestOwnDeletion(userId: string): Promise<Date> {
  const requestedAt = new Date();
  const db = getDb();
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { deactivatedAt: requestedAt, deletionRequestedAt: requestedAt } }),
    db.providerProfile.updateMany({ where: { userId, status: "PUBLISHED" }, data: { status: "PAUSED" } }),
  ]);
  await requestSearchReindexForUser(userId);
  return requestedAt;
}

/** Bei jeder Anmeldung: Deaktivierung und Löschantrag aufheben. Gibt zurück, ob etwas aufgehoben wurde. */
export async function reactivateOnSignIn(userId: string): Promise<boolean> {
  const { count } = await getDb().user.updateMany({
    where: { id: userId, OR: [{ deactivatedAt: { not: null } }, { deletionRequestedAt: { not: null } }] },
    data: { deactivatedAt: null, deletionRequestedAt: null },
  });
  return count > 0;
}

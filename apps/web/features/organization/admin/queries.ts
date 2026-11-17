import {
  getOrganizationVerification,
  listOrganizationVerifications,
} from "@app/core/organization";
import { getDb } from "@app/db";
import { cache } from "react";

export type OrganizationVerificationCase = NonNullable<
  Awaited<ReturnType<typeof getOrganizationVerification>>
>;

/** Eingereichte Nachweise, älteste zuerst; der Kern prüft die Rolle selbst. */
export async function getOrganizationQueue(actorId: string) {
  return listOrganizationVerifications(actorId);
}

/** Offene Prüfungen für die Seitenleiste; nur für Personen mit Moderationsrolle aufgerufen. */
export async function countOpenOrganizationVerifications(): Promise<number> {
  return getDb().organizationVerification.count({
    where: { status: "SUBMITTED" },
  });
}

/** Gibt es die Prüfung? Für die echte 404 vor dem Ladezustand. */
export async function organizationVerificationExists(
  id: string,
): Promise<boolean> {
  if (id.length === 0 || id.length > 64) return false;
  return (await getDb().organizationVerification.count({ where: { id } })) > 0;
}

/** Der Fall, einmal pro Anfrage. */
export const getOrganizationCase = cache(async (actorId: string, id: string) =>
  getOrganizationVerification(actorId, id),
);

/** Nächster offener Fall nach einem Entscheid, ohne den gerade entschiedenen. */
export async function nextOrganizationCase(
  actorId: string,
  exceptId: string,
): Promise<string | null> {
  return (
    (await listOrganizationVerifications(actorId)).find(
      (entry) => entry.id !== exceptId,
    )?.id ?? null
  );
}

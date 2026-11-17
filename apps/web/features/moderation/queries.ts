import { appealableCaseFor, listOwnRestrictions, type AppealableCase, type OwnRestriction } from "@app/core/moderation";
import { cache } from "react";

/** Wo die eigenen Einschränkungen stehen (Entscheid 0021): «Daten und Konto», Abschnitt «Einschränkungen». */
export const RESTRICTIONS_ANCHOR = "einschraenkungen";

/** Aktive Einschränkungen des eigenen Kontos, einmal pro Anfrage. */
export const ownRestrictions = cache(async (userId: string): Promise<OwnRestriction[]> => listOwnRestrictions(userId));

/**
 * Gilt für das Konto eine Einschränkung dieser Art (eine Sperre schliesst
 * alle ein)? Dann ihr spätestes Ende, `until: null` ohne Ende.
 */
export async function restrictionFor(userId: string, kind: "MESSAGING" | "BOOKING"): Promise<{ until: string | null } | null> {
  const matching = (await ownRestrictions(userId)).filter((entry) => entry.kind === kind || entry.kind === "SUSPENDED");
  if (matching.length === 0) return null;
  if (matching.some((entry) => entry.until === null)) return { until: null };
  const latest = Math.max(...matching.map((entry) => entry.until?.getTime() ?? 0));
  return { until: new Date(latest).toISOString() };
}

/** Entschiedener Fall zu einem eigenen Medium, für den Einspruch im Studio. */
export async function mediaCase(userId: string, mediaId: string): Promise<AppealableCase | null> {
  return appealableCaseFor(userId, "MEDIA", mediaId);
}

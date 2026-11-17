import type { ProviderStatus } from "@app/db";
import { z } from "zod";
import type { ProfileSection } from "./editor-schemas";

/**
 * Wie Änderungen wirken (PRD v2 11.2, v1 FR-PROFILE-006, Entscheid 0012):
 * - `direct`: Entwurf und Korrektur (Onboarding); alles gilt sofort, ohne Prüffall.
 * - `reviewed`: freigegebene Profile; prüfpflichtige Felder warten auf die Prüfung, das bisherige Profil bleibt online.
 * - `locked`: in Prüfung, gesperrt oder archiviert; nichts lässt sich ändern.
 */
export type EditMode = "direct" | "reviewed" | "locked";

export function editMode(status: ProviderStatus): EditMode {
  if (status === "DRAFT" || status === "CHANGES_REQUESTED") return "direct";
  if (status === "PUBLISHED" || status === "PAUSED" || status === "RESTRICTED") return "reviewed";
  return "locked";
}

/** Die prüfpflichtigen Felder: Anzeigename, Kontaktwege und Regionen. */
export interface CriticalValues {
  displayName: string;
  allowMessages: boolean;
  allowBookingRequests: boolean;
  regionIds: string[];
}
export type CriticalField = keyof CriticalValues;
export const CRITICAL_FIELDS = ["displayName", "allowMessages", "allowBookingRequests", "regionIds"] as const satisfies readonly CriticalField[];

/** Prüfpflichtige Felder pro Abschnitt. */
export const SECTION_CRITICAL_FIELDS: Record<ProfileSection, readonly CriticalField[]> = {
  basics: ["displayName"],
  description: [],
  offer: [],
  rates: [],
  contact: ["allowMessages", "allowBookingRequests"],
  visibility: [],
  regions: ["regionIds"],
};

/** Gespeicherte Form von `ProviderProfile.pendingChanges`. */
export const pendingChangesSchema = z
  .object({
    displayName: z.string().min(1).max(60),
    allowMessages: z.boolean(),
    allowBookingRequests: z.boolean(),
    regionIds: z.array(z.string().min(1).max(40)).min(1).max(10),
  })
  .partial();
export type PendingChanges = z.infer<typeof pendingChangesSchema>;

/** Liest `pendingChanges`; Unlesbares gilt als keine Änderung. */
export function parsePendingChanges(value: unknown): PendingChanges {
  const parsed = pendingChangesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  return left.size === new Set(b).size && b.every((entry) => left.has(entry));
}

function isSubset(subset: readonly string[], of: readonly string[]): boolean {
  const all = new Set(of);
  return subset.every((entry) => all.has(entry));
}

export interface CriticalSplit {
  /** Gilt sofort. */
  immediate: Partial<CriticalValues>;
  /** Wartet auf die Prüfung. */
  pending: Partial<CriticalValues>;
}

/**
 * Teilt die angefragten prüfpflichtigen Werte. Im Modus `reviewed` gilt:
 * Anzeigename geprüft; Kontaktweg abschalten oder Regionen streichen sofort,
 * weil es nur einschränkt; Kontaktweg einschalten oder Regionen hinzufügen
 * geprüft. Unveränderte Werte erscheinen in keiner Liste.
 */
export function splitCritical(current: CriticalValues, requested: Partial<CriticalValues>, mode: EditMode): CriticalSplit {
  const immediate: Partial<CriticalValues> = {};
  const pending: Partial<CriticalValues> = {};
  if (requested.displayName !== undefined && requested.displayName !== current.displayName) {
    if (mode === "reviewed") pending.displayName = requested.displayName;
    else immediate.displayName = requested.displayName;
  }
  for (const field of ["allowMessages", "allowBookingRequests"] as const) {
    const value = requested[field];
    if (value === undefined || value === current[field]) continue;
    if (mode === "reviewed" && value) pending[field] = value;
    else immediate[field] = value;
  }
  const regionIds = requested.regionIds;
  if (regionIds !== undefined && !sameSet(regionIds, current.regionIds)) {
    if (mode === "reviewed" && !isSubset(regionIds, current.regionIds)) pending.regionIds = [...new Set(regionIds)];
    else immediate.regionIds = [...new Set(regionIds)];
  }
  return { immediate, pending };
}

/**
 * Neuer Stand der wartenden Änderungen nach dem Speichern eines Abschnitts:
 * Die Felder des Abschnitts ersetzen ihren bisherigen Eintrag; was jetzt
 * sofort gilt oder dem Online-Stand entspricht, wartet nicht mehr.
 */
export function mergePending(previous: PendingChanges, section: ProfileSection, split: CriticalSplit): PendingChanges {
  const own = new Set<string>(SECTION_CRITICAL_FIELDS[section]);
  const kept = Object.fromEntries(Object.entries(previous).filter(([field]) => !own.has(field))) as PendingChanges;
  return { ...kept, ...split.pending };
}

export function hasPending(changes: PendingChanges): boolean {
  return CRITICAL_FIELDS.some((field) => changes[field] !== undefined);
}

export function samePending(a: PendingChanges, b: PendingChanges): boolean {
  return CRITICAL_FIELDS.every((field) => {
    const left = a[field];
    const right = b[field];
    if (Array.isArray(left) && Array.isArray(right)) return sameSet(left, right);
    return left === right;
  });
}

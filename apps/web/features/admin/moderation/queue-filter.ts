import type { ReportQueueFilter } from "@app/core/moderation";

/**
 * Filter der Warteschlange `/admin/moderation` in der URL, mit deutschen
 * Werten (Entscheid 0021). Unbekannte Werte fallen auf die Vorgabe zurück:
 * aktive Fälle, alle Prioritäten, alle Arten, alle Zuweisungen.
 */
export const STATUS_FILTERS = { aktiv: "ACTIVE", pruefung: "IN_REVIEW", erledigt: "RESOLVED", abgewiesen: "DISMISSED", einspruch: "APPEALED" } as const;
export const PRIORITY_FILTERS = { kritisch: "CRITICAL", hoch: "HIGH", normal: "NORMAL", niedrig: "LOW" } as const;
export const TARGET_FILTERS = {
  nachricht: "MESSAGE",
  mitglied: "USER",
  profil: "PROFILE",
  medium: "MEDIA",
  bewertung: "REVIEW",
  organisation: "ORGANIZATION",
  adresse: "URL",
} as const;
export const ASSIGNED_FILTERS = { mir: "me", frei: "none" } as const;

export type StatusParam = keyof typeof STATUS_FILTERS;
export type PriorityParam = keyof typeof PRIORITY_FILTERS;
export type TargetParam = keyof typeof TARGET_FILTERS;
export type AssignedParam = keyof typeof ASSIGNED_FILTERS;

export interface QueueParams {
  status: StatusParam;
  prioritaet: PriorityParam | null;
  art: TargetParam | null;
  zuweisung: AssignedParam | null;
  /** `sperren`: Einsprüche gegen Einschränkungen statt der Fälle. */
  ansicht: "faelle" | "sperren";
}

type Raw = Record<string, string | string[] | undefined>;

function pick<Key extends string>(raw: Raw, name: string, allowed: Record<Key, unknown>): Key | null {
  const value = raw[name];
  return typeof value === "string" && Object.hasOwn(allowed, value) ? (value as Key) : null;
}

export function parseQueueParams(raw: Raw): QueueParams {
  return {
    status: pick(raw, "status", STATUS_FILTERS) ?? "aktiv",
    prioritaet: pick(raw, "prioritaet", PRIORITY_FILTERS),
    art: pick(raw, "art", TARGET_FILTERS),
    zuweisung: pick(raw, "zuweisung", ASSIGNED_FILTERS),
    ansicht: raw.ansicht === "sperren" ? "sperren" : "faelle",
  };
}

export function toCoreFilter(params: QueueParams): ReportQueueFilter {
  return {
    status: STATUS_FILTERS[params.status],
    ...(params.prioritaet ? { priority: PRIORITY_FILTERS[params.prioritaet] } : {}),
    ...(params.art ? { targetType: TARGET_FILTERS[params.art] } : {}),
    ...(params.zuweisung ? { assigned: ASSIGNED_FILTERS[params.zuweisung] } : {}),
  };
}

/** Query der URL ohne Vorgaben, damit `/admin/moderation` ohne Filter kurz bleibt. */
export function queueQuery(params: Partial<QueueParams>): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.ansicht === "sperren") return { ansicht: "sperren" };
  if (params.status && params.status !== "aktiv") query.status = params.status;
  if (params.prioritaet) query.prioritaet = params.prioritaet;
  if (params.art) query.art = params.art;
  if (params.zuweisung) query.zuweisung = params.zuweisung;
  return query;
}

/** Ob ein Filter von der Vorgabe abweicht; dann bietet die Liste «Filter zurücksetzen» an. */
export function hasFilters(params: QueueParams): boolean {
  return Object.keys(queueQuery(params)).length > 0;
}

/**
 * Regeln, auf die sich ein Prüfentscheid bezieht (PRD 12.4). Die Kennung wird
 * gespeichert; der Text steht in den Übersetzungen unter `admin.rules.<key>`.
 */
export const REVIEW_RULES = [
  { id: "R-1", key: "complete" },
  { id: "R-2", key: "descriptionUnclear" },
  { id: "R-3", key: "regionNotAllowed" },
  { id: "R-4", key: "pricesImplausible" },
  { id: "R-5", key: "policyViolation" },
] as const;

export type ReviewRuleId = (typeof REVIEW_RULES)[number]["id"];

export function isReviewRule(value: string): value is ReviewRuleId {
  return REVIEW_RULES.some((rule) => rule.id === value);
}

/** Bereiche, zu denen eine Rückgabe zur Korrektur einen Grund nennen kann (Schema `fieldNotes`). */
export const FIELD_NOTE_AREAS = ["regions", "profile", "offer", "media", "availability"] as const;
export type FieldNoteArea = (typeof FIELD_NOTE_AREAS)[number];

export const DECISIONS = ["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;
export type Decision = (typeof DECISIONS)[number];

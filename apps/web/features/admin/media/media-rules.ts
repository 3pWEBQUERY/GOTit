/** Regeln, auf die sich ein Entscheid über ein Medium bezieht (PRD v2 12.4); Text unter `admin.media.rules.<key>`. */
export const MEDIA_RULES = [
  { id: "M-1", key: "compliant" },
  { id: "M-2", key: "quality" },
  { id: "M-3", key: "identifying" },
  { id: "M-4", key: "consent" },
  { id: "M-5", key: "policyViolation" },
] as const;

export function isMediaRule(value: string): boolean {
  return MEDIA_RULES.some((rule) => rule.id === value);
}

export const MEDIA_DECISION_OPTIONS = ["PUBLISHED", "CHANGES_REQUESTED", "BLOCKED"] as const;
export type MediaDecisionOption = (typeof MEDIA_DECISION_OPTIONS)[number];

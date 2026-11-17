/**
 * Regeln der allgemeinen Moderation (v2 12.4 «Jeder Entscheid braucht
 * Begründung und Regelbezug»). Die Texte stehen in den Übersetzungen unter
 * `admin.moderation.rules`; Bewertungen haben eigene Regeln R-REV-1 bis 5
 * (Entscheid 0017).
 */
export const MODERATION_RULE_KEYS = [
  // Belästigung, Drohung, Beleidigung.
  "R-MOD-1",
  // Betrug, Spam, Täuschung über Leistungen oder Preise.
  "R-MOD-2",
  // Falsche Identität, fremde Bilder.
  "R-MOD-3",
  // Verdacht auf Minderjährigkeit.
  "R-MOD-4",
  // Verdacht auf Zwang, Ausbeutung oder Menschenhandel.
  "R-MOD-5",
  // Gewalt, akute Gefahr.
  "R-MOD-6",
  // Unzulässige Inhalte oder Medien (Nutzungsbedingungen).
  "R-MOD-7",
  // Veröffentlichung privater Daten Dritter.
  "R-MOD-8",
  // Kein Verstoss festgestellt.
  "R-MOD-0",
] as const;
export type ModerationRuleKey = (typeof MODERATION_RULE_KEYS)[number];

/**
 * Priorität aus dem Meldegrund (v2 12.4). `CRITICAL`: Verdacht auf
 * Minderjährigkeit, Zwang oder Menschenhandel und akute Gefahr.
 */
export function priorityForReason(reason: string): "CRITICAL" | "HIGH" | "NORMAL" | "LOW" {
  if (reason === "minor" || reason === "exploitation" || reason === "danger") return "CRITICAL";
  if (reason === "scam" || reason === "impersonation" || reason === "harassment") return "HIGH";
  if (reason === "spam") return "LOW";
  return "NORMAL";
}

/**
 * Welche Regel zu welchem Entscheid passt (v2 12.4 «Jeder Entscheid braucht
 * Begründung und Regelbezug»): «Kein Verstoss» nur mit R-MOD-0, jede
 * Massnahme nur mit einer Regel R-MOD-1 bis 8. Der Kern prüft dasselbe.
 * Ohne Import aus dem Kern, damit die Datei im Browser laufen kann; die
 * Schlüssel kommen vom Server.
 */
export const NO_VIOLATION_RULE = "R-MOD-0";

export function decisionRules(decision: string | null, keys: readonly string[]): string[] {
  if (decision === "NO_ACTION") return keys.filter((key) => key === NO_VIOLATION_RULE);
  if (decision === null) return [...keys];
  return keys.filter((key) => key !== NO_VIOLATION_RULE);
}

/** Mindestlänge der Begründung, wie im Kern. */
export const REASON_MIN = 10;
export const REASON_MAX = 2000;

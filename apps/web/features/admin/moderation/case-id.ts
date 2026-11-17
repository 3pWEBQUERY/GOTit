const YEAR = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", year: "numeric" });

/**
 * Fall-ID für Menschen (v1 9.3), zum Beispiel «M-2026-00412»: Jahr des
 * Eingangs in Zürcher Zeit und die fortlaufende Nummer, auf fünf Stellen
 * aufgefüllt (Entscheid 0021). Die Nummer ist über alle Jahre eindeutig.
 */
export function formatCaseId(number: number, createdAt: Date): string {
  return `M-${YEAR.format(createdAt)}-${String(number).padStart(5, "0")}`;
}

/**
 * Erlaubt als Rücksprungziel nur Pfade der eigenen Anwendung. Verhindert
 * offene Weiterleitungen über `?weiter=` (Altersprüfung, Anmeldung).
 */
export function safeReturnPath(candidate: string | null | undefined, fallback: string): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  if ([...candidate].some((char) => char.charCodeAt(0) < 32)) return fallback;
  return candidate;
}

/**
 * Antwort einer Server Action an ein Formular. Fehler sind Übersetzungsschlüssel
 * pro Feld; die Oberfläche zeigt sie am Feld und zusammengefasst oben (PRD 13).
 */
export type ActionResult<Data = undefined> =
  | { ok: true; data?: Data }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string; retryAfterSeconds?: number };

export function fieldErrorsFromZod(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

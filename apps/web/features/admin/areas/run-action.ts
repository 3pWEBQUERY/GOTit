import { AdminForbiddenError } from "@app/core/admin";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Rahmen jeder Server Action der Admin-Bereiche: angemeldet sein, dann den
 * Kern aufrufen. Der Kern prüft das Recht selbst und wirft ohne Recht
 * `AdminForbiddenError`; daraus wird der Formularfehler `forbidden`
 * (Schlüssel unter `adminCommon.errors`).
 */
export async function adminAction<Data = undefined>(run: (actorId: string) => Promise<ActionResult<Data>>): Promise<ActionResult<Data>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  try {
    return await run(viewer.userId);
  } catch (error) {
    if (error instanceof AdminForbiddenError || (error instanceof Error && error.message.startsWith("forbidden:"))) return { ok: false, formError: "forbidden" };
    throw error;
  }
}

/** Liest einen Text aus den Formularwerten; fehlt er, ein leerer Text. */
export function text(values: unknown, key: string): string {
  const value = values && typeof values === "object" ? (values as Record<string, unknown>)[key] : undefined;
  return typeof value === "string" ? value : "";
}

/** Liest einen Schalter aus den Formularwerten. */
export function flag(values: unknown, key: string): boolean {
  return Boolean(values && typeof values === "object" && (values as Record<string, unknown>)[key] === true);
}

/** Liest eine Mehrfachauswahl aus den Formularwerten. */
export function list(values: unknown, key: string): string[] {
  const value = values && typeof values === "object" ? (values as Record<string, unknown>)[key] : undefined;
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/** Fehler für eine Begründung mit Mindest- und Höchstlänge. */
export function reasonError(value: string, min = 10, max = 500): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "required";
  if (trimmed.length < min) return "tooShort";
  if (trimmed.length > max) return "tooLong";
  return null;
}

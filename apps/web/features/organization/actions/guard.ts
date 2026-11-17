import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";

/** Antwort der Server Actions der Organisation; Fehler sind Schlüssel unter `organization.errors`. */
export type OrganizationActionResult<Data = undefined> =
  | { ok: true; data?: Data }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
    };

/** Angemeldete Person; der Kern prüft Mitgliedschaft und Recht selbst. */
export async function actorId(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer.kind === "account" ? viewer.userId : null;
}

/** Fehler des Kerns als Schlüssel; «forbidden» erscheint nur, wenn die Oberfläche veraltet ist. */
export function reasonKey(reason: string): string {
  const keys: Record<string, string> = {
    "not-found": "notFound",
    forbidden: "forbidden",
    invalid: "invalid",
    open: "alreadySubmitted",
    "provider-unavailable": "providerUnavailable",
    "already-linked": "alreadyLinked",
  };
  return keys[reason] ?? "generic";
}

/** Zeigt den neuen Stand auf allen Seiten der Organisation. */
export function refreshOrganization(): void {
  revalidatePath("/[locale]/studio/o/[org]", "layout");
}

/** Fehler am Feld aus den Befunden des gemeinsamen Schemas. */
export function issuesToFields(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

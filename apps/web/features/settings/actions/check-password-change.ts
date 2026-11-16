"use server";

import { changePasswordSchema } from "@app/core/account";
import { fieldErrorsFromZod } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Prüft das Formular «Passwort ändern» mit dem geteilten Schema. Das Ändern
 * selbst läuft über den Auth-Client, damit dessen Rate Limit greift. Die
 * Eingaben werden nur geprüft, nicht gespeichert und nicht protokolliert.
 */
export async function checkPasswordChange(input: unknown): Promise<Record<string, string>> {
  if ((await getViewer()).kind !== "account") return { form: "signInRequired" };
  const parsed = changePasswordSchema.safeParse(input);
  return parsed.success ? {} : fieldErrorsFromZod(parsed.error.issues);
}

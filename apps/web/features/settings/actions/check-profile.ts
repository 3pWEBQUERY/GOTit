"use server";

import { profileSchema } from "@app/core/account";
import { getDb } from "@app/db";
import { getViewer } from "../../shell/queries/get-viewer";
import { fieldErrorsFromZod } from "../../account/action-result";

/**
 * Prüft das Profilformular beim Verlassen eines Felds mit demselben Schema wie
 * `updateProfile`. Meldet einen vergebenen Benutzernamen schon vor dem Speichern.
 */
export async function checkProfile(input: unknown): Promise<Record<string, string>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { form: "signInRequired" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error.issues);
  const { username } = parsed.data;
  if (!username) return {};
  const taken = await getDb().user.findFirst({ where: { username, NOT: { id: viewer.userId } }, select: { id: true } });
  return taken ? { username: "usernameTaken" } : {};
}

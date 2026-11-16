"use server";

import { profileSchema, recordSecurityEvent, updateOwnProfile } from "@app/core/account";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getViewer } from "../../shell/queries/get-viewer";
import { fieldErrorsFromZod, type ActionResult } from "../action-result";

/** Name und Benutzername des eigenen Kontos. */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const result = await updateOwnProfile(viewer.userId, parsed.data);
  if (!result.ok) return { ok: false, fieldErrors: { [result.field]: result.error } };
  await recordSecurityEvent(viewer.userId, "PROFILE_CHANGED", (await headers()).get("user-agent"));
  revalidatePath("/", "layout");
  return { ok: true };
}

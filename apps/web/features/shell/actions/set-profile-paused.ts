"use server";

import { pauseAvailability, setOwnProfilePaused, type PauseAvailability } from "@app/core/provider-profile";
import type { ProviderStatus } from "@app/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "../queries/get-viewer";

const schema = z.object({ paused: z.boolean() });

export type SetProfilePausedResult = { ok: true; status: ProviderStatus; availability: PauseAvailability } | { ok: false };

/** «Profil pausieren» und «Profil fortsetzen»: ein Klick, sofort wirksam (PRD 6.2). */
export async function setProfilePaused(input: z.input<typeof schema>): Promise<SetProfilePausedResult> {
  const { paused } = schema.parse(input);
  const result = await setOwnProfilePaused(await getViewer(), paused);
  if (!result.ok) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true, status: result.status, availability: pauseAvailability(result.status) };
}

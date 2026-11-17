"use server";

import { deleteOwnMedia, mediaIdSchema, moveOwnMedia, reorderOwnMedia, setCoverMedia, setOwnMediaAltText, setOwnMediaVisibility } from "@app/core/media";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { mediaOwnerId } from "./media-owner";

const ids = z.array(mediaIdSchema).min(1).max(120);


function done(ok: boolean, formError = "generic"): ActionResult {
  if (ok) revalidatePath("/[locale]/studio", "layout");
  return ok ? { ok: true } : { ok: false, formError };
}

/** Reihenfolge per Drag-and-drop; die Liste enthält genau die eigenen Medien. */
export async function reorderMedia(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  if (!userId) return { ok: false, formError: "generic" };
  return done((await reorderOwnMedia(userId, input)).ok);
}

const moveInput = z.object({ mediaId: mediaIdSchema, direction: z.enum(["forward", "backward"]) });

/** «Nach vorne» und «Nach hinten» aus dem Menü, für die Tastatur. */
export async function moveMedia(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  const parsed = moveInput.safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  return done((await moveOwnMedia(userId, parsed.data.mediaId, { direction: parsed.data.direction })).ok);
}

export async function makeCover(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  const parsed = z.object({ mediaId: mediaIdSchema }).safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  return done((await setCoverMedia(userId, parsed.data.mediaId)).ok);
}

const visibilityInput = z.object({ mediaIds: ids, visibility: z.enum(["PUBLIC", "MEMBERS"]) });

export async function changeVisibility(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  const parsed = visibilityInput.safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  const { updated } = await setOwnMediaVisibility(userId, parsed.data.mediaIds, { visibility: parsed.data.visibility });
  return done(updated > 0);
}

const altInput = z.object({ mediaId: mediaIdSchema, altText: z.string() });

export async function saveAltText(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  const parsed = altInput.safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  const result = await setOwnMediaAltText(userId, parsed.data.mediaId, { altText: parsed.data.altText });
  if (!result.ok && result.reason === "invalid") return { ok: false, fieldErrors: { altText: "altTextTooLong" } };
  return done(result.ok);
}

/** Löscht eines oder mehrere eigene Medien; Original und Varianten entfernt ein Job. */
export async function deleteMedia(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  const userId = await mediaOwnerId();
  const parsed = z.object({ mediaIds: ids }).safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  const { deleted } = await deleteOwnMedia(userId, parsed.data.mediaIds);
  if (deleted === 0) return { ok: false, formError: "generic" };
  revalidatePath("/[locale]/studio", "layout");
  return { ok: true, data: { deleted } };
}

"use server";

import {
  deleteOrganizationMedia,
  deleteOwnMedia,
  mediaIdSchema,
  moveOrganizationMedia,
  moveOwnMedia,
  reorderOrganizationMedia,
  reorderOwnMedia,
  setCoverMedia,
  setOrganizationCover,
  setOrganizationLogo,
  setOrganizationMediaAltText,
  setOwnMediaAltText,
  setOwnMediaVisibility,
} from "@app/core/media";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { mediaActor, mediaOwnerId } from "./media-owner";

const ids = z.array(mediaIdSchema).min(1).max(120);

function done(ok: boolean, formError = "generic"): ActionResult {
  if (ok) revalidatePath("/[locale]/studio", "layout");
  return ok ? { ok: true } : { ok: false, formError };
}

/** Reihenfolge per Drag-and-drop; die Liste enthält genau die eigenen Medien (oder die der Organisation). */
export async function reorderMedia(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  if (!actor) return { ok: false, formError: "generic" };
  const order = { order: (input as { order?: unknown }).order };
  return done((actor.org ? await reorderOrganizationMedia(actor.userId, actor.org, order) : await reorderOwnMedia(actor.userId, order)).ok);
}

const moveInput = z.object({ mediaId: mediaIdSchema, direction: z.enum(["forward", "backward"]) });

/** «Nach vorne» und «Nach hinten» aus dem Menü, für die Tastatur. */
export async function moveMedia(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  const parsed = moveInput.safeParse(input);
  if (!actor || !parsed.success) return { ok: false, formError: "generic" };
  const { mediaId, direction } = parsed.data;
  return done((actor.org ? await moveOrganizationMedia(actor.userId, actor.org, mediaId, { direction }) : await moveOwnMedia(actor.userId, mediaId, { direction })).ok);
}

export async function makeCover(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  const parsed = z.object({ mediaId: mediaIdSchema }).safeParse(input);
  if (!actor || !parsed.success) return { ok: false, formError: "generic" };
  return done((actor.org ? await setOrganizationCover(actor.userId, actor.org, parsed.data.mediaId) : await setCoverMedia(actor.userId, parsed.data.mediaId)).ok);
}

/** Logo einer Organisation; ein Bild ist nie Logo und Titelbild zugleich. */
export async function makeLogo(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  const parsed = z.object({ mediaId: mediaIdSchema }).safeParse(input);
  if (!actor?.org || !parsed.success) return { ok: false, formError: "generic" };
  return done((await setOrganizationLogo(actor.userId, actor.org, parsed.data.mediaId)).ok);
}

const visibilityInput = z.object({ mediaIds: ids, visibility: z.enum(["PUBLIC", "MEMBERS"]) });

/** Nur für Profile: Medien einer Organisation sind immer öffentlich. */
export async function changeVisibility(input: unknown): Promise<ActionResult> {
  const userId = await mediaOwnerId();
  const parsed = visibilityInput.safeParse(input);
  if (!userId || !parsed.success) return { ok: false, formError: "generic" };
  const { updated } = await setOwnMediaVisibility(userId, parsed.data.mediaIds, { visibility: parsed.data.visibility });
  return done(updated > 0);
}

const altInput = z.object({ mediaId: mediaIdSchema, altText: z.string() });

export async function saveAltText(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  const parsed = altInput.safeParse(input);
  if (!actor || !parsed.success) return { ok: false, formError: "generic" };
  const value = { altText: parsed.data.altText };
  const result = actor.org ? await setOrganizationMediaAltText(actor.userId, actor.org, parsed.data.mediaId, value) : await setOwnMediaAltText(actor.userId, parsed.data.mediaId, value);
  if (!result.ok && result.reason === "invalid") return { ok: false, fieldErrors: { altText: "altTextTooLong" } };
  return done(result.ok);
}

/** Löscht eines oder mehrere Medien; Original und Varianten entfernt ein Job. */
export async function deleteMedia(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  const actor = await mediaActor(input);
  const parsed = z.object({ mediaIds: ids }).safeParse(input);
  if (!actor || !parsed.success) return { ok: false, formError: "generic" };
  const { deleted } = actor.org ? await deleteOrganizationMedia(actor.userId, actor.org, parsed.data.mediaIds) : await deleteOwnMedia(actor.userId, parsed.data.mediaIds);
  if (deleted === 0) return { ok: false, formError: "generic" };
  revalidatePath("/[locale]/studio", "layout");
  return { ok: true, data: { deleted } };
}

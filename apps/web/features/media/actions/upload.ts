"use server";

import {
  confirmOrganizationUpload,
  confirmUpload,
  deleteOrganizationMedia,
  deleteOwnMedia,
  mediaIdSchema,
  ownMediaStatus,
  requestOrganizationUpload,
  requestUpload,
} from "@app/core/media";
import type { MediaStatus } from "@app/db";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { mediaActor, mediaOwnerId } from "./media-owner";

const REASON_KEYS = { "no-profile": "noProfile", "not-allowed": "notAllowed", type: "type", size: "size", rights: "rights", quota: "quota" } as const;

export interface UploadTicket {
  mediaId: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

/** Schritt 1: Upload anmelden. Fehler sind Schlüssel unter `media.upload.errors`. */
export async function requestMediaUpload(input: unknown): Promise<ActionResult<UploadTicket>> {
  const actor = await mediaActor(input);
  if (!actor) return { ok: false, formError: "noProfile" };
  const result = actor.org ? await requestOrganizationUpload(actor.userId, actor.org, input) : await requestUpload(actor.userId, input);
  if (!result.ok) return { ok: false, formError: REASON_KEYS[result.reason] };
  return { ok: true, data: { mediaId: result.mediaId, ...result.upload } };
}

const idInput = z.object({ mediaId: mediaIdSchema });

/** Schritt 2: fertigen Upload melden; der Worker übernimmt. */
export async function confirmMediaUpload(input: unknown): Promise<ActionResult> {
  const actor = await mediaActor(input);
  const parsed = idInput.safeParse(input);
  if (!actor || !parsed.success) return { ok: false, formError: "generic" };
  const result = actor.org ? await confirmOrganizationUpload(actor.userId, actor.org, parsed.data.mediaId) : await confirmUpload(actor.userId, parsed.data.mediaId);
  if (result.ok) return { ok: true };
  return { ok: false, formError: result.reason === "too-large" ? "size" : result.reason === "missing" ? "missing" : "generic" };
}

/** Ein abgebrochener Upload belegt keinen Platz: Das Medium wird gelöscht. */
export async function abandonMediaUpload(input: unknown): Promise<void> {
  const actor = await mediaActor(input);
  const parsed = idInput.safeParse(input);
  if (!actor || !parsed.success) return;
  if (actor.org) await deleteOrganizationMedia(actor.userId, actor.org, parsed.data.mediaId);
  else await deleteOwnMedia(actor.userId, parsed.data.mediaId);
}

const statusInput = z.object({ mediaIds: z.array(mediaIdSchema).min(1).max(120) });

/** Stand der Verarbeitung für die Bibliothek, solange Medien verarbeitet werden. */
export async function pollMediaStatus(input: unknown): Promise<{ id: string; status: MediaStatus }[]> {
  const userId = await mediaOwnerId();
  const parsed = statusInput.safeParse(input);
  if (!userId || !parsed.success) return [];
  return (await ownMediaStatus(userId, parsed.data.mediaIds)).map(({ id, status }) => ({ id, status }));
}

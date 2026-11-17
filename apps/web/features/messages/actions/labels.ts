"use server";

import {
  createLabel,
  deleteLabel,
  renameLabel,
  setConversationLabels,
  setConversationNote,
  type LabelResult,
} from "@app/core/messaging";
import { z } from "zod";
import { providerAccount } from "./guard";

/**
 * Private Labels und Notizen der Anbieterseite (v1 FR-CHAT-003). Die
 * Gegenseite sieht sie nie; der Kern prüft, dass das Konto in der
 * Unterhaltung die Anbieterseite ist.
 */
export type LabelActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: Extract<LabelResult, { ok: false }>["reason"] };

const fail = (): LabelActionResult => ({ ok: false, reason: "invalid" });

export async function createLabelAction(
  name: string,
): Promise<LabelActionResult> {
  const viewer = await providerAccount();
  if (!viewer) return fail();
  return createLabel(viewer.userId, name);
}

export async function renameLabelAction(
  labelId: string,
  name: string,
): Promise<LabelActionResult> {
  const viewer = await providerAccount();
  if (!viewer) return fail();
  return renameLabel(viewer.userId, labelId, name);
}

export async function deleteLabelAction(labelId: string): Promise<boolean> {
  const viewer = await providerAccount();
  if (!viewer) return false;
  return deleteLabel(viewer.userId, labelId);
}

const labelIds = z.array(z.string().max(64)).max(20);

export async function setConversationLabelsAction(
  conversationId: string,
  ids: string[],
): Promise<boolean> {
  const viewer = await providerAccount();
  const parsed = labelIds.safeParse(ids);
  if (!viewer || !parsed.success) return false;
  return setConversationLabels(viewer.userId, conversationId, parsed.data);
}

export async function setNoteAction(
  conversationId: string,
  note: string,
): Promise<boolean> {
  const viewer = await providerAccount();
  if (!viewer) return false;
  return setConversationNote(viewer.userId, conversationId, note);
}

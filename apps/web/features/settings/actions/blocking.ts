"use server";

import { blockCounterpart, unblockByConversation } from "@app/core/messaging";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";

const schema = z.object({ conversationId: z.string().min(1).max(64) });

async function withConversation(input: unknown, run: (userId: string, conversationId: string) => Promise<boolean>): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "invalidInput" };
  // Der Kern sucht nur in eigenen Unterhaltungen; eine fremde ID verhält sich wie eine unbekannte (PRD 16.2).
  if (!(await run(viewer.userId, parsed.data.conversationId))) return { ok: false, formError: "blockNotFound" };
  return { ok: true };
}

/** «Blockierung aufheben» unter `/einstellungen/privatsphaere` (v1 FR-CHAT-002, Entscheid 0014). */
export async function unblockContact(input: unknown): Promise<ActionResult> {
  return withConversation(input, unblockByConversation);
}

/** «Rückgängig» im Toast nach dem Aufheben: blockiert dieselbe Gegenseite wieder (PRD 13). */
export async function reblockContact(input: unknown): Promise<ActionResult> {
  return withConversation(input, blockCounterpart);
}

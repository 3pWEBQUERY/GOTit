"use server";

import {
  deleteOwnMessage,
  getThread,
  markRead,
  sendMessage,
  setArchived,
  setStarred,
} from "@app/core/messaging";
import { idSchema } from "@app/core/messaging/schemas";
import type { SendFailure } from "../lib/thread-state";
import type { ClientMessage } from "../lib/types";
import { toClientMessage } from "../queries/to-client";
import { messagingAccount } from "./guard";

export type SendActionResult =
  | { ok: true; messageId: string }
  | { ok: false; failure: SendFailure };

/**
 * Nachricht senden (v1 FR-CHAT-001). Idempotent über die Kennung des
 * Browsers. «nicht zustellbar» sagt nie, ob blockiert wurde.
 */
export async function sendMessageAction(
  conversationId: string,
  input: { body: string; clientId: string; attachmentIds: string[] },
): Promise<SendActionResult> {
  const guard = await messagingAccount("messageSend");
  if (!guard.ok)
    return {
      ok: false,
      failure: guard.reason === "rate-limited" ? "rate-limited" : "invalid",
    };
  const result = await sendMessage(guard.viewer, conversationId, input);
  if (result.ok) return { ok: true, messageId: result.messageId };
  return {
    ok: false,
    failure:
      result.reason === "undeliverable"
        ? "undeliverable"
        : result.reason === "attachments"
          ? "attachments"
          : "invalid",
  };
}

/** Gelesen bis jetzt; die Gegenseite sieht es nur mit Lesebestätigungen auf beiden Seiten. */
export async function markReadAction(conversationId: string): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return markRead(guard.viewer.userId, conversationId);
}

/** Ältere Nachrichten vor einer bekannten Nachricht. */
export async function loadOlderAction(
  conversationId: string,
  beforeId: string,
): Promise<{ messages: ClientMessage[]; hasOlder: boolean } | null> {
  const guard = await messagingAccount();
  if (!guard.ok || !idSchema.safeParse(beforeId).success) return null;
  const thread = await getThread(guard.viewer.userId, conversationId, {
    before: beforeId,
  });
  if (!thread) return null;
  return {
    messages: thread.messages.map(toClientMessage),
    hasOlder: thread.hasOlder,
  };
}

/** Eigene Nachricht für beide Seiten löschen; nicht umkehrbar. */
export async function deleteMessageAction(messageId: string): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return deleteOwnMessage(guard.viewer.userId, messageId);
}

export async function setArchivedAction(
  conversationId: string,
  archived: boolean,
): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return setArchived(guard.viewer.userId, conversationId, archived === true);
}

export async function setStarredAction(
  conversationId: string,
  starred: boolean,
): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return setStarred(guard.viewer.userId, conversationId, starred === true);
}

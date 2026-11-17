import type { ThreadMessageView, ThreadView } from "@app/core/messaging";
import { yearOf } from "../lib/time";
import type { ClientMessage, ClientThread } from "../lib/types";

/** Name der Gegenseite: Anzeigename oder Benutzername; ohne Benutzername «Mitglied seit {Jahr}» (Entscheid 0014). */
export function counterpartName(
  name: string | null,
  memberSince: Date | null,
  fallback: (year: number) => string,
): string {
  if (name) return name;
  return fallback(
    memberSince ? yearOf(memberSince.toISOString()) : new Date().getFullYear(),
  );
}

export function toClientMessage(message: ThreadMessageView): ClientMessage {
  return {
    id: message.id,
    clientId: message.clientId,
    fromMe: message.fromMe,
    body: message.body,
    deleted: message.deleted,
    hidden: message.hidden,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      width: attachment.width,
      height: attachment.height,
    })),
  };
}

export function toClientThread(
  thread: ThreadView,
  fallback: (year: number) => string,
  messagingRestriction: ClientThread["messagingRestriction"] = null,
): ClientThread {
  const since = thread.counterpart.memberSince;
  return {
    conversationId: thread.conversationId,
    role: thread.role,
    counterpart: {
      name: counterpartName(thread.counterpart.name, since, fallback),
      profileSlug: thread.counterpart.profileSlug,
      memberSinceYear:
        thread.role === "PROVIDER" && since
          ? yearOf(since.toISOString())
          : null,
    },
    messages: thread.messages.map(toClientMessage),
    hasOlder: thread.hasOlder,
    blockedByMe: thread.blockedByMe,
    starred: thread.starred,
    archived: thread.archived,
    note: thread.note,
    labelIds: thread.labelIds,
    messagingRestriction,
  };
}

"use server";

import {
  confirmAttachment,
  discardAttachment,
  pendingAttachments,
  requestAttachmentUpload,
  type RequestAttachmentResult,
} from "@app/core/messaging";
import type { ClientPendingAttachment } from "../lib/types";
import { messagingAccount } from "./guard";

/**
 * Bilder im Chat wie Profilmedien (Entscheid 0011, 0014): signierte URL für
 * den direkten Upload, Bestätigung, dann entfernt der Worker EXIF und GPS.
 */
export type AttachmentTicket =
  | {
      ok: true;
      attachmentId: string;
      url: string;
      method: "PUT";
      headers: Record<string, string>;
    }
  | {
      ok: false;
      reason:
        | Extract<RequestAttachmentResult, { ok: false }>["reason"]
        | "rate-limited";
    };

export async function requestAttachmentAction(
  conversationId: string,
  input: { contentType: string; sizeBytes: number },
): Promise<AttachmentTicket> {
  const guard = await messagingAccount("chatAttachment");
  if (!guard.ok)
    return {
      ok: false,
      reason: guard.reason === "rate-limited" ? "rate-limited" : "not-found",
    };
  const result = await requestAttachmentUpload(
    guard.viewer.userId,
    conversationId,
    input,
  );
  if (!result.ok) return result;
  return { ok: true, attachmentId: result.attachmentId, ...result.upload };
}

export async function confirmAttachmentAction(
  attachmentId: string,
): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return confirmAttachment(guard.viewer.userId, attachmentId);
}

/** Stand der eigenen, noch nicht gesendeten Bilder, solange der Worker arbeitet. */
export async function pendingAttachmentsAction(
  conversationId: string,
): Promise<ClientPendingAttachment[]> {
  const guard = await messagingAccount();
  if (!guard.ok) return [];
  return (await pendingAttachments(guard.viewer.userId, conversationId)).map(
    (entry) => ({
      id: entry.id,
      status: entry.status,
      failureReason: entry.failureReason,
      width: entry.width,
      height: entry.height,
    }),
  );
}

export async function discardAttachmentAction(
  attachmentId: string,
): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return discardAttachment(guard.viewer.userId, attachmentId);
}

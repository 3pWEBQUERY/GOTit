"use server";

import {
  blockCounterpart,
  reportCounterpart,
  reportMessage,
  unblockCounterpart,
} from "@app/core/messaging";
import { messagingAccount } from "./guard";

export type ReportActionResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "rate-limited" };

/** Blockieren wirkt sofort und ohne Mitteilung an die Gegenseite (v1 FR-CHAT-005). */
export async function blockAction(conversationId: string): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return blockCounterpart(guard.viewer.userId, conversationId);
}

export async function unblockAction(conversationId: string): Promise<boolean> {
  const guard = await messagingAccount();
  if (!guard.ok) return false;
  return unblockCounterpart(guard.viewer.userId, conversationId);
}

/** Eine Nachricht der Gegenseite melden; die Kopie hängt am Fall. */
export async function reportMessageAction(
  messageId: string,
  input: { reason: string; details: string },
): Promise<ReportActionResult> {
  const guard = await messagingAccount("report");
  if (!guard.ok)
    return {
      ok: false,
      reason: guard.reason === "rate-limited" ? "rate-limited" : "invalid",
    };
  const result = await reportMessage(guard.viewer.userId, messageId, input);
  return result.ok ? { ok: true } : { ok: false, reason: "invalid" };
}

/** Die Gegenseite melden, mit den letzten zehn Nachrichten als Kopie. */
export async function reportCounterpartAction(
  conversationId: string,
  input: { reason: string; details: string },
): Promise<ReportActionResult> {
  const guard = await messagingAccount("report");
  if (!guard.ok)
    return {
      ok: false,
      reason: guard.reason === "rate-limited" ? "rate-limited" : "invalid",
    };
  const result = await reportCounterpart(
    guard.viewer.userId,
    conversationId,
    input,
  );
  return result.ok ? { ok: true } : { ok: false, reason: "invalid" };
}

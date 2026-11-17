import type { Locale } from "@app/core/locale";
import { getThread, pendingAttachments } from "@app/core/messaging";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { requireAccount } from "../../account/require-account";
import type {
  ClientPendingAttachment,
  ClientThread,
  MessengerArea,
} from "../lib/types";
import { restrictionFor } from "../../moderation/queries";
import { toClientThread } from "./to-client";

/**
 * Eine Unterhaltung des Kontos oder 404; einmal pro Anfrage für Layout und
 * Seite. Fremde IDs verhalten sich wie unbekannte (Entscheid 0014).
 */
export const requireThread = cache(
  async (
    locale: Locale,
    conversationId: string,
  ): Promise<{
    userId: string;
    thread: ClientThread;
    pending: ClientPendingAttachment[];
  }> => {
    const viewer = await requireAccount(locale);
    const [thread, pending, t, restriction] = await Promise.all([
      getThread(viewer.userId, conversationId),
      pendingAttachments(viewer.userId, conversationId),
      getTranslations({ locale, namespace: "messages" }),
      restrictionFor(viewer.userId, "MESSAGING"),
    ]);
    if (!thread) notFound();
    return {
      userId: viewer.userId,
      thread: toClientThread(
        thread,
        (year) => t("memberFallback", { year }),
        restriction,
      ),
      pending: pending.map((entry) => ({
        id: entry.id,
        status: entry.status,
        failureReason: entry.failureReason,
        width: entry.width,
        height: entry.height,
      })),
    };
  },
);

/**
 * Wie `requireThread`, dazu der passende Bereich: Ist das Konto in der
 * Unterhaltung Anbieter, gehört sie ins Studio, sonst in den Marktplatz. Ein
 * Link in den falschen Bereich führt an die richtige Stelle.
 */
export async function requireThreadIn(
  locale: Locale,
  conversationId: string,
  area: MessengerArea,
): Promise<void> {
  const { thread } = await requireThread(locale, conversationId);
  const belongs: MessengerArea =
    thread.role === "PROVIDER" ? "studio" : "member";
  if (belongs === area) return;
  redirect({
    href: {
      pathname:
        belongs === "studio" ? "/studio/nachrichten/[id]" : "/nachrichten/[id]",
      params: { id: conversationId },
    },
    locale,
  });
}

"use server";

import type { Locale } from "@app/core/locale";
import { startConversation } from "@app/core/messaging";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { messagingAccount } from "./guard";

export type StartFailure =
  | "sign-in"
  | "rate-limited"
  | "not-found"
  | "not-allowed"
  | "own-profile"
  | "undeliverable";

/**
 * «Nachricht schreiben» auf dem Profil (v1 FR-CHAT-001): öffnet die
 * bestehende Unterhaltung oder beginnt eine neue und führt in den Thread.
 * Eine Blockierung verrät die Antwort nicht.
 */
export async function startConversationAction(
  slug: string,
): Promise<{ ok: false; reason: StartFailure }> {
  const guard = await messagingAccount("conversationStart");
  if (!guard.ok) return { ok: false, reason: guard.reason };
  const result = await startConversation(guard.viewer, String(slug));
  if (!result.ok) return { ok: false, reason: result.reason };
  const locale = (await getLocale()) as Locale;
  return redirect({
    href: {
      pathname: "/nachrichten/[id]",
      params: { id: result.conversationId },
    },
    locale,
  });
}

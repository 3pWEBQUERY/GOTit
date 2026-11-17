import type { Locale } from "@app/core/locale";
import { listInbox } from "@app/core/messaging";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

export interface OverviewEntry {
  id: string;
  title: string;
  detail: string;
  href: string;
  /** Relative Zeit mit dem genauen Datum im Tooltip (PRD 13). */
  time?: { iso: string; relative: string; exact: string };
}

export interface MemberOverview {
  openRequests: OverviewEntry[];
  unreadConversations: OverviewEntry[];
  upcomingAppointments: OverviewEntry[];
  recentlyViewed: OverviewEntry[];
}

/** Höchstzahl ungelesener Unterhaltungen auf `/ich`; alle weiteren stehen im Postfach. */
export const OVERVIEW_CONVERSATION_LIMIT = 5;

/**
 * Ungelesene Unterhaltungen, die neueste zuerst. Eine Unterhaltung, in der
 * das Konto Anbieter ist, führt ins Studio-Postfach.
 */
async function unreadConversations(userId: string, locale: Locale, now: Date): Promise<OverviewEntry[]> {
  const [entries, t, format] = await Promise.all([
    listInbox(userId, { view: "ungelesen" }, OVERVIEW_CONVERSATION_LIMIT),
    getTranslations({ locale, namespace: "member.overview.conversations" }),
    getFormatter({ locale }),
  ]);
  const href = createHref(locale);
  return entries.map((entry) => {
    const asProvider = entry.counterpart.role === "MEMBER";
    const params = { id: entry.conversationId };
    return {
      id: entry.conversationId,
      title: entry.counterpart.name ?? t("memberFallback"),
      detail: t(asProvider ? "newMessagesStudio" : "newMessages", { count: entry.unread }),
      href: href(asProvider ? { pathname: "/studio/nachrichten/[id]", params } : { pathname: "/nachrichten/[id]", params }),
      time: {
        iso: entry.lastMessageAt.toISOString(),
        relative: format.relativeTime(entry.lastMessageAt, now),
        exact: format.dateTime(entry.lastMessageAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      },
    };
  });
}

/**
 * Daten der Übersicht `/ich` (PRD 12.1). Anfragen und Termine gibt es erst
 * mit Schritt 1.9; bis dahin sind diese Listen ehrlich leer statt mit
 * Beispieldaten gefüllt.
 */
export async function getMemberOverview(userId: string, locale: Locale, now = new Date()): Promise<MemberOverview> {
  return { openRequests: [], unreadConversations: await unreadConversations(userId, locale, now), upcomingAppointments: [], recentlyViewed: [] };
}

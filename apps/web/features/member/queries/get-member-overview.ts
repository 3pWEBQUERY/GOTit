import type { Locale } from "@app/core/locale";
import { listInbox } from "@app/core/messaging";
import { formatRange } from "../../booking/lib/format";
import { loadMemberRequests } from "../../booking/queries/load-member-requests";
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

/** Höchstzahl offener Anfragen und nächster Termine auf `/ich`; alle weiteren stehen unter `/termine`. */
export const OVERVIEW_BOOKING_LIMIT = 5;

/**
 * Offene Anfragen («Angefragt», «In Abstimmung») und bestätigte, noch nicht
 * vergangene Termine, der nächste zuerst. Die Zeit steht in der Zone des
 * Anbieters (v2 11.5); ihr Name fehlt hier, die Anfrage selbst nennt ihn.
 */
async function bookings(userId: string, locale: Locale, tab: "offen" | "bestaetigt", now: Date): Promise<OverviewEntry[]> {
  const [rows, t] = await Promise.all([loadMemberRequests(userId, tab, now), getTranslations({ locale, namespace: "booking" })]);
  const href = createHref(locale);
  return rows.slice(0, OVERVIEW_BOOKING_LIMIT).map((row) => ({
    id: row.id,
    title: row.counterpartName ?? t("memberFallback"),
    detail: `${formatRange(row.startsAt.toISOString(), row.endsAt.toISOString(), row.timeZone, locale)} · ${t(`status.${row.status}`)}`,
    href: href({ pathname: "/termine/[id]", params: { id: row.id } }),
  }));
}

/** Daten der Übersicht `/ich` (PRD 12.1). */
export async function getMemberOverview(userId: string, locale: Locale, now = new Date()): Promise<MemberOverview> {
  const [openRequests, unread, upcomingAppointments] = await Promise.all([bookings(userId, locale, "offen", now), unreadConversations(userId, locale, now), bookings(userId, locale, "bestaetigt", now)]);
  return { openRequests, unreadConversations: unread, upcomingAppointments, recentlyViewed: [] };
}

import type { Locale } from "@app/core/locale";
import {
  ensureDefaultLabels,
  listInbox,
  listLabels,
  type InboxEntry,
} from "@app/core/messaging";
import type { Conversation } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { HrefBuilder } from "../../shell/nav/href";
import { inboxQuery, type InboxParams } from "../lib/inbox-params";
import { listTime } from "../lib/time";
import type { ClientLabel, MessengerArea } from "../lib/types";
import { counterpartName } from "./to-client";

export interface InboxData {
  conversations: Conversation[];
  /** Nur im Studio: eigene Labels für Filter und Zuordnung. */
  labels: ClientLabel[];
}

/** Pfad einer Unterhaltung im jeweiligen Bereich, mit dem Zustand der Liste in der URL. */
export function threadHref(
  href: HrefBuilder,
  area: MessengerArea,
  conversationId: string,
  params?: InboxParams,
): string {
  const query = params ? inboxQuery(params) : {};
  return href({
    pathname:
      area === "studio" ? "/studio/nachrichten/[id]" : "/nachrichten/[id]",
    params: { id: conversationId },
    ...(Object.keys(query).length > 0 ? { query } : {}),
  });
}

/**
 * Postfach für die Liste (PRD v2 11.4): im Marktplatz die Unterhaltungen, in
 * denen das Konto Mitglied ist, im Studio die als Anbieter. Im Studio
 * entstehen beim ersten Öffnen die Standard-Labels mit übersetzten Namen
 * (Entscheid 0014).
 */
export async function loadInbox(options: {
  userId: string;
  locale: Locale;
  area: MessengerArea;
  params: InboxParams;
  currentId: string | null;
  href: HrefBuilder;
}): Promise<InboxData> {
  const { userId, locale, area, params } = options;
  const t = await getTranslations({ locale, namespace: "messages" });
  if (area === "studio")
    await ensureDefaultLabels(userId, [
      t("labels.defaults.newRequest"),
      t("labels.defaults.appointmentOpen"),
      t("labels.defaults.confirmed"),
      t("labels.defaults.needsReply"),
    ]);
  const [entries, labels] = await Promise.all([
    listInbox(userId, {
      role: area === "studio" ? "PROVIDER" : "MEMBER",
      view: params.view,
      q: params.q || null,
      labelId: area === "studio" ? params.labelId : null,
    }),
    area === "studio" ? listLabels(userId) : Promise.resolve([]),
  ]);
  const now = new Date().toISOString();
  const preview = (entry: InboxEntry): string => {
    const text =
      entry.lastKind === "text"
        ? (entry.preview ?? "")
        : entry.lastKind === "image"
          ? t("list.previewImage")
          : entry.lastKind === "deleted"
            ? t("list.previewDeleted")
            : entry.lastKind === "hidden"
              ? t("list.previewHidden")
              : t("list.previewNone");
    return entry.lastFromMe && entry.lastKind !== "none"
      ? t("list.previewOwn", { text })
      : text;
  };
  return {
    labels,
    conversations: entries.map((entry) => {
      const iso = entry.lastMessageAt.toISOString();
      return {
        key: entry.conversationId,
        href: threadHref(options.href, area, entry.conversationId, params),
        name: counterpartName(
          entry.counterpart.name,
          entry.counterpart.memberSince,
          (year) => t("memberFallback", { year }),
        ),
        time: listTime(iso, now, locale, t("time.yesterday")),
        dateTime: iso,
        preview: preview(entry),
        unreadLabel:
          entry.unread > 0
            ? t("list.unread", { count: entry.unread })
            : undefined,
        labels: [
          ...(entry.starred
            ? [{ key: "starred", label: t("list.starred") }]
            : []),
          ...(entry.blockedByMe
            ? [{ key: "blocked", label: t("list.blocked") }]
            : []),
          ...entry.labels.map((label) => ({
            key: label.id,
            label: label.name,
          })),
        ],
        current: entry.conversationId === options.currentId,
      };
    }),
  };
}

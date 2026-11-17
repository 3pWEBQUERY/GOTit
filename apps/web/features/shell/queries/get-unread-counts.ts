import { countUnreadConversations } from "@app/core/messaging";
import { hasProviderRole } from "@app/core/identity";
import { cache } from "react";
import { getViewer } from "./get-viewer";

export interface UnreadCounts {
  /** Unterhaltungen als Mitglied: Kopfzeile und Tab «Nachrichten» im Marktplatz. */
  member: number;
  /** Unterhaltungen als Anbieter: Studio-Seitenleiste und Tab «Nachrichten» im Studio. */
  studio: number;
}

/**
 * Ungelesene Unterhaltungen für die Zahlen in der Shell. `cache` gilt nur für
 * diese eine Anfrage, damit Kopfzeile und Studio-Rahmen dieselbe Zahl zeigen;
 * zwischen Anfragen oder Konten wird nichts geteilt.
 */
export const getUnreadCounts = cache(async (): Promise<UnreadCounts> => {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { member: 0, studio: 0 };
  const [member, studio] = await Promise.all([
    countUnreadConversations(viewer.userId, "MEMBER"),
    hasProviderRole(viewer) ? countUnreadConversations(viewer.userId, "PROVIDER") : Promise.resolve(0),
  ]);
  return { member, studio };
});

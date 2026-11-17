import { getDb } from "@app/db";
import { purgeUnsentAttachments } from "./attachments";
import { removeAttachmentObjects } from "./attachment-storage";

/**
 * Aufbewahrung im Messenger (v1 FR-CHAT-005, «bereinigbare Anhänge»).
 * Läuft im Cron-Dienst vor dem endgültigen Löschen von Konten:
 * - Bilder der Konten, deren Löschfrist abgelaufen ist, verlassen den Bucket,
 *   bevor die Kaskade die Zeilen entfernt.
 * - Unterhaltungen, in denen nur noch eine Seite übrig ist, werden gelöscht.
 * - Nie gesendete Bilder verschwinden nach 24 Stunden.
 */
export async function purgeMessagingData(
  expiringUserIds: readonly string[],
  now = new Date(),
): Promise<{ attachments: number; unsent: number }> {
  const db = getDb();
  let attachments = 0;
  if (expiringUserIds.length > 0) {
    const owned = await db.messageAttachment.findMany({
      where: { ownerUserId: { in: [...expiringUserIds] } },
      select: { id: true, originalKey: true, processedKey: true },
    });
    await removeAttachmentObjects(owned);
    await db.messageAttachment.deleteMany({
      where: { id: { in: owned.map((entry) => entry.id) } },
    });
    attachments = owned.length;
  }
  return { attachments, unsent: await purgeUnsentAttachments(now) };
}

/** Nach dem Löschen der Konten: Unterhaltungen mit nur noch einer Seite samt Bildern entfernen. */
export async function purgeOrphanConversations(): Promise<number> {
  const db = getDb();
  const orphans = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM conversation c
    WHERE (SELECT count(*) FROM conversation_participant p WHERE p."conversationId" = c.id) < 2`;
  if (orphans.length === 0) return 0;
  const ids = orphans.map((row) => row.id);
  const files = await db.messageAttachment.findMany({
    where: { conversationId: { in: ids } },
    select: { originalKey: true, processedKey: true },
  });
  await removeAttachmentObjects(files);
  await db.messageAttachment.deleteMany({
    where: { conversationId: { in: ids } },
  });
  await db.conversation.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

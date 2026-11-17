import { getDb } from "@app/db";
import { participantOf } from "./access";
import { THREAD_PAGE_SIZE, idSchema } from "./schemas";

/**
 * Eine Unterhaltung aus der Sicht eines Beteiligten. Zustellstatus (v2 11.4):
 * «Gesendet», sobald gespeichert; «Gelesen» nur, wenn beide Seiten
 * Lesebestätigungen erlauben (Voreinstellung aus, Entscheid 0008). Der
 * Online-Status wird nicht angezeigt.
 */
export interface ThreadMessageView {
  id: string;
  fromMe: boolean;
  body: string | null;
  deleted: boolean;
  createdAt: Date;
  status: "sent" | "read" | null;
  attachments: { id: string; width: number | null; height: number | null }[];
}

export interface ThreadView {
  conversationId: string;
  role: "MEMBER" | "PROVIDER";
  counterpart: {
    userId: string;
    name: string | null;
    profileSlug: string | null;
    memberSince: Date | null;
  };
  providerProfileSlug: string;
  messages: ThreadMessageView[];
  hasOlder: boolean;
  /**
   * Blockiert das eigene Konto die Gegenseite? Ob die Gegenseite blockiert, steht
   * bewusst nicht in der Sicht: Blockieren geschieht ohne Mitteilung (v2 11.4).
   */
  blockedByMe: boolean;
  starred: boolean;
  archived: boolean;
  note: string | null;
  labelIds: string[];
}

export async function getThread(
  userId: string,
  conversationId: string,
  options: { before?: string | null } = {},
): Promise<ThreadView | null> {
  const participation = await participantOf(userId, conversationId);
  if (!participation) return null;
  const db = getDb();
  const before =
    options.before && idSchema.safeParse(options.before).success
      ? await db.message.findFirst({
          where: { id: options.before, conversationId },
          select: { createdAt: true },
        })
      : null;
  const [own, other, profile, rows, blocks, preferences] = await Promise.all([
    db.conversationParticipant.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId, userId } },
      select: {
        starred: true,
        archivedAt: true,
        note: true,
        labels: { select: { labelId: true } },
      },
    }),
    db.conversationParticipant.findUniqueOrThrow({
      where: {
        conversationId_userId: {
          conversationId,
          userId: participation.counterpartId,
        },
      },
      select: {
        lastReadAt: true,
        user: { select: { username: true, createdAt: true } },
      },
    }),
    db.providerProfile.findUniqueOrThrow({
      where: { id: participation.providerProfileId },
      select: { slug: true, displayName: true },
    }),
    db.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: before.createdAt } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: THREAD_PAGE_SIZE + 1,
      select: {
        id: true,
        senderId: true,
        body: true,
        deletedAt: true,
        createdAt: true,
        attachments: {
          where: { status: "READY" },
          select: { id: true, width: true, height: true },
        },
      },
    }),
    db.block.findMany({
      where: { blockerId: userId, blockedId: participation.counterpartId },
      select: { blockerId: true },
    }),
    db.userPreference.findMany({
      where: { userId: { in: [userId, participation.counterpartId] } },
      select: { userId: true, readReceipts: true },
    }),
  ]);
  const receipts = [userId, participation.counterpartId].every(
    (id) =>
      preferences.find((entry) => entry.userId === id)?.readReceipts === true,
  );
  const page = rows.slice(0, THREAD_PAGE_SIZE).reverse();
  return {
    conversationId,
    role: participation.role,
    counterpart:
      participation.role === "MEMBER"
        ? {
            userId: participation.counterpartId,
            name: profile.displayName,
            profileSlug: profile.slug,
            memberSince: null,
          }
        : {
            userId: participation.counterpartId,
            name: other.user.username,
            profileSlug: null,
            memberSince: other.user.createdAt,
          },
    providerProfileSlug: profile.slug,
    messages: page.map((message) => {
      const fromMe = message.senderId === userId;
      const read =
        receipts &&
        other.lastReadAt !== null &&
        other.lastReadAt >= message.createdAt;
      return {
        id: message.id,
        fromMe,
        body: message.deletedAt ? null : message.body,
        deleted: message.deletedAt !== null,
        createdAt: message.createdAt,
        status: fromMe && !message.deletedAt ? (read ? "read" : "sent") : null,
        attachments: message.deletedAt ? [] : message.attachments,
      };
    }),
    hasOlder: rows.length > THREAD_PAGE_SIZE,
    blockedByMe: blocks.some((entry) => entry.blockerId === userId),
    starred: own.starred,
    archived: own.archivedAt !== null,
    note: participation.role === "PROVIDER" ? own.note : null,
    labelIds:
      participation.role === "PROVIDER"
        ? own.labels.map((entry) => entry.labelId)
        : [],
  };
}

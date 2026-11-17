import { getDb } from "@app/db";
import { participantOf } from "./access";
import { idSchema } from "./schemas";

/**
 * Blockieren (v1 FR-CHAT-005, v2 11.4): wirkt sofort, ohne Mitteilung an die
 * Gegenseite. Danach kann keine Seite der anderen schreiben und keine neue
 * Unterhaltung beginnen. Blockiert wird über eine Unterhaltung; die ID der
 * Gegenseite kennt der Browser nie.
 */
export async function blockCounterpart(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const participation = await participantOf(userId, conversationId);
  if (!participation) return false;
  await getDb().block.upsert({
    where: {
      blockerId_blockedId: {
        blockerId: userId,
        blockedId: participation.counterpartId,
      },
    },
    create: { blockerId: userId, blockedId: participation.counterpartId },
    update: {},
  });
  return true;
}

export async function unblockCounterpart(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const participation = await participantOf(userId, conversationId);
  if (!participation) return false;
  await getDb().block.deleteMany({
    where: { blockerId: userId, blockedId: participation.counterpartId },
  });
  return true;
}

export interface BlockedEntry {
  /** Unterhaltung, über die blockiert wurde; dient als Griff zum Aufheben. */
  conversationId: string | null;
  name: string | null;
  profileSlug: string | null;
  blockedAt: Date;
}

/** «Blockiert» in den Einstellungen (v1 FR-CHAT-002, v2 7.5 `/einstellungen/privatsphaere`). */
export async function listBlocked(userId: string): Promise<BlockedEntry[]> {
  const db = getDb();
  const blocks = await db.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      blockedId: true,
      createdAt: true,
      blocked: {
        select: {
          username: true,
          providerProfile: { select: { displayName: true, slug: true } },
        },
      },
    },
  });
  const conversations = await db.conversationParticipant.findMany({
    where: {
      userId,
      conversation: {
        participants: {
          some: { userId: { in: blocks.map((entry) => entry.blockedId) } },
        },
      },
    },
    select: {
      conversationId: true,
      conversation: { select: { participants: { select: { userId: true } } } },
    },
  });
  return blocks.map((entry) => {
    const shared = conversations.find((row) =>
      row.conversation.participants.some(
        (participant) => participant.userId === entry.blockedId,
      ),
    );
    const profile = entry.blocked.providerProfile;
    return {
      conversationId: shared?.conversationId ?? null,
      name: profile?.displayName ?? entry.blocked.username,
      profileSlug: profile?.slug ?? null,
      blockedAt: entry.createdAt,
    };
  });
}

/** Aufheben aus den Einstellungen, ebenfalls über die Unterhaltung. */
export async function unblockByConversation(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  if (!idSchema.safeParse(conversationId).success) return false;
  return unblockCounterpart(userId, conversationId);
}

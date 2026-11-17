import { getDb, type ParticipantRole } from "@app/db";
import { idSchema } from "./schemas";

/**
 * Autorisierung auf Objektebene: Jede Funktion des Messengers geht über
 * `participantOf`. Wer nicht beteiligt ist, bekommt `null` und damit dieselbe
 * Antwort wie bei einer unbekannten ID. Verknüpfte Unternehmen und interne
 * Rollen haben hier keinen Zugang (v1 FR-CHAT-005).
 */
export interface Participation {
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  /** Die andere Seite. */
  counterpartId: string;
  providerProfileId: string;
}

export async function participantOf(
  userId: string,
  conversationId: string,
): Promise<Participation | null> {
  if (!idSchema.safeParse(conversationId).success) return null;
  const rows = await getDb().conversationParticipant.findMany({
    where: { conversationId },
    select: {
      userId: true,
      role: true,
      conversation: { select: { providerProfileId: true } },
    },
  });
  const own = rows.find((row) => row.userId === userId);
  const other = rows.find((row) => row.userId !== userId);
  if (!own || !other) return null;
  return {
    conversationId,
    userId,
    role: own.role,
    counterpartId: other.userId,
    providerProfileId: own.conversation.providerProfileId,
  };
}

/** Blockiert eine der beiden Seiten die andere? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const count = await getDb().block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

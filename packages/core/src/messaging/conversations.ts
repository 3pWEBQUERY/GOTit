import { getDb, Prisma } from "@app/db";
import { isRestricted } from "../moderation/restrictions";
import type { Viewer } from "../identity/types";
import { contactOptions, publicState } from "../provider-profile/public-policy";
import { isBlockedBetween, participantOf } from "./access";
import { removeAttachmentObjects } from "./attachment-storage";
import { notifyUsers } from "./notify";
import { idSchema, sendMessageSchema } from "./schemas";
import { recordStat } from "../stats/record";

/** Kann ein Konto dieses Profil gerade erreichen, und darf es eine Unterhaltung beginnen? */
async function profileContact(providerProfileId: string, viewer: Viewer) {
  const db = getDb();
  const profile = await db.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true,
      userId: true,
      status: true,
      visibility: true,
      allowMessages: true,
      allowBookingRequests: true,
      reviews: {
        where: { kind: "PROFILE" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { decision: true },
      },
    },
  });
  if (!profile) return null;
  const identity = await db.identityCheck.findFirst({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      ageOver18: true,
      livenessPassed: true,
      expiresAt: true,
    },
  });
  const state = publicState(
    {
      status: profile.status,
      visibility: profile.visibility,
      identity,
      latestProfileReview: profile.reviews[0]?.decision ?? null,
    },
    viewer,
  );
  return {
    profile,
    state,
    contact: contactOptions(
      profile.status,
      profile.allowMessages,
      profile.allowBookingRequests,
    ),
  };
}

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | {
      ok: false;
      reason: "not-found" | "not-allowed" | "own-profile" | "undeliverable" | "restricted";
    };

/**
 * Unterhaltung mit einem Anbieter beginnen oder die bestehende öffnen
 * (Einzelchat, v1 FR-CHAT-001). Nur angemeldete, altersbestätigte Konten, nur
 * erreichbare Profile mit freigeschalteten Nachrichten. Anbieter schreiben
 * Mitglieder nie von sich aus an. Eine Blockierung verrät die Antwort nicht.
 */
export async function startConversation(
  viewer: Viewer,
  providerProfileSlug: string,
): Promise<StartConversationResult> {
  if (viewer.kind !== "account" || !viewer.ageConfirmed)
    return { ok: false, reason: "not-allowed" };
  // Eingeschränkt durch die Moderation (v1 9.2): keine neuen Unterhaltungen.
  if (await isRestricted(viewer.userId, "MESSAGING"))
    return { ok: false, reason: "restricted" };
  const db = getDb();
  const target = await db.providerProfile.findUnique({
    where: { slug: providerProfileSlug },
    select: { id: true },
  });
  if (!target) return { ok: false, reason: "not-found" };
  const existing = await db.conversation.findUnique({
    where: {
      memberUserId_providerProfileId: {
        memberUserId: viewer.userId,
        providerProfileId: target.id,
      },
    },
    select: { id: true },
  });
  if (existing) return { ok: true, conversationId: existing.id };
  const facts = await profileContact(target.id, viewer);
  if (!facts || facts.state !== "ready")
    return { ok: false, reason: "not-found" };
  if (facts.profile.userId === viewer.userId)
    return { ok: false, reason: "own-profile" };
  if (!facts.contact.messages) return { ok: false, reason: "not-allowed" };
  if (await isBlockedBetween(viewer.userId, facts.profile.userId))
    return { ok: false, reason: "undeliverable" };
  try {
    const conversation = await db.conversation.create({
      data: {
        providerProfileId: target.id,
        memberUserId: viewer.userId,
        participants: {
          create: [
            { userId: viewer.userId, role: "MEMBER" },
            { userId: facts.profile.userId, role: "PROVIDER" },
          ],
        },
      },
      select: { id: true },
    });
    await recordStat(target.id, "CONTACT_ACTION");
    return { ok: true, conversationId: conversation.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const again = await db.conversation.findUniqueOrThrow({
        where: {
          memberUserId_providerProfileId: {
            memberUserId: viewer.userId,
            providerProfileId: target.id,
          },
        },
        select: { id: true },
      });
      return { ok: true, conversationId: again.id };
    }
    throw error;
  }
}

export type SendMessageResult =
  | { ok: true; messageId: string; createdAt: Date; duplicate: boolean }
  | {
      ok: false;
      reason: "not-found" | "invalid" | "undeliverable" | "attachments" | "restricted";
    };

/**
 * Nachricht senden (v1 FR-CHAT-001, Abnahme 20.4). Idempotent über `clientId`:
 * Ein erneutes Senden nach einem Netzfehler ergibt keine zweite Nachricht.
 * Blockiert eine Seite die andere, ist die Nachricht nicht zustellbar; die
 * Antwort sagt nicht, wer wen blockiert. Auf der Mitgliederseite muss das
 * Profil erreichbar bleiben (veröffentlicht oder pausiert); gesperrte,
 * archivierte oder abgelaufene Profile nehmen keine Nachrichten mehr an.
 */
export async function sendMessage(
  viewer: Viewer,
  conversationId: string,
  input: unknown,
  now = new Date(),
): Promise<SendMessageResult> {
  if (viewer.kind !== "account") return { ok: false, reason: "not-found" };
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const participation = await participantOf(viewer.userId, conversationId);
  if (!participation) return { ok: false, reason: "not-found" };
  if (await isRestricted(viewer.userId, "MESSAGING"))
    return { ok: false, reason: "restricted" };
  const db = getDb();
  const { body, clientId, attachmentIds } = parsed.data;
  const duplicate = await db.message.findUnique({
    where: { senderId_clientId: { senderId: viewer.userId, clientId } },
    select: { id: true, createdAt: true, conversationId: true },
  });
  if (duplicate)
    return duplicate.conversationId === conversationId
      ? {
          ok: true,
          messageId: duplicate.id,
          createdAt: duplicate.createdAt,
          duplicate: true,
        }
      : { ok: false, reason: "invalid" };
  if (await isBlockedBetween(viewer.userId, participation.counterpartId))
    return { ok: false, reason: "undeliverable" };
  if (participation.role === "MEMBER") {
    const facts = await profileContact(participation.providerProfileId, viewer);
    if (!facts || (facts.state !== "ready" && facts.state !== "paused"))
      return { ok: false, reason: "undeliverable" };
  }
  const ready =
    attachmentIds.length === 0
      ? 0
      : await db.messageAttachment.count({
          where: {
            id: { in: attachmentIds },
            ownerUserId: viewer.userId,
            conversationId,
            status: "READY",
            messageId: null,
          },
        });
  if (ready !== attachmentIds.length)
    return { ok: false, reason: "attachments" };

  const message = await db.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: viewer.userId,
        body: body.length > 0 ? body : null,
        clientId,
        createdAt: now,
      },
      select: { id: true, createdAt: true },
    });
    if (attachmentIds.length > 0)
      await tx.messageAttachment.updateMany({
        where: {
          id: { in: attachmentIds },
          ownerUserId: viewer.userId,
          messageId: null,
        },
        data: { messageId: created.id },
      });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    });
    await tx.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: viewer.userId },
      },
      data: { lastReadAt: now },
    });
    // Eine neue Nachricht holt die Unterhaltung beim Empfänger aus dem Archiv.
    await tx.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: participation.counterpartId,
        },
      },
      data: { archivedAt: null },
    });
    return created;
  });
  await notifyUsers([viewer.userId, participation.counterpartId], {
    type: "conversation",
    conversationId,
  });
  return {
    ok: true,
    messageId: message.id,
    createdAt: message.createdAt,
    duplicate: false,
  };
}

/** Gelesen bis jetzt. Die Gegenseite erfährt es nur, wenn beide Lesebestätigungen erlauben (siehe Thread). */
export async function markRead(
  userId: string,
  conversationId: string,
  now = new Date(),
): Promise<boolean> {
  const participation = await participantOf(userId, conversationId);
  if (!participation) return false;
  await getDb().conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: now },
  });
  await notifyUsers([participation.counterpartId], {
    type: "conversation",
    conversationId,
  });
  return true;
}

/**
 * Eigene Nachricht löschen: Der Text verschwindet für beide Seiten, die Zeile
 * bleibt als «Nachricht gelöscht». Die Bilder werden aus dem Speicher
 * entfernt. Eine Meldung behält ihre Kopie des Texts.
 */
export async function deleteOwnMessage(
  userId: string,
  messageId: string,
  now = new Date(),
): Promise<boolean> {
  if (!idSchema.safeParse(messageId).success) return false;
  const db = getDb();
  const message = await db.message.findFirst({
    where: { id: messageId, senderId: userId, deletedAt: null },
    select: {
      id: true,
      conversationId: true,
      attachments: { select: { originalKey: true, processedKey: true } },
    },
  });
  if (!message) return false;
  const participation = await participantOf(userId, message.conversationId);
  if (!participation) return false;
  await db.$transaction([
    db.message.update({
      where: { id: message.id },
      data: { body: null, deletedAt: now },
    }),
    db.messageAttachment.deleteMany({ where: { messageId: message.id } }),
  ]);
  await notifyUsers([userId, participation.counterpartId], {
    type: "conversation",
    conversationId: message.conversationId,
  });
  await removeAttachmentObjects(message.attachments);
  return true;
}

/** Archivieren und Markieren gelten nur für die eigene Sicht. */
export async function setArchived(
  userId: string,
  conversationId: string,
  archived: boolean,
  now = new Date(),
): Promise<boolean> {
  if (!(await participantOf(userId, conversationId))) return false;
  await getDb().conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: archived ? now : null },
  });
  return true;
}

export async function setStarred(
  userId: string,
  conversationId: string,
  starred: boolean,
): Promise<boolean> {
  if (!(await participantOf(userId, conversationId))) return false;
  await getDb().conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { starred },
  });
  return true;
}

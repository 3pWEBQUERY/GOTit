import { getDb, type Prisma } from "@app/db";
import { fileReport } from "../moderation/intake";
import { participantOf } from "./access";
import { idSchema, reportSchema } from "./schemas";

/**
 * Melden (v1 FR-CHAT-001, Abnahme 20.4 «Meldungen werden an die Moderation
 * übergeben»). Eine gemeldete Nachricht wird als Kopie an den Fall gehängt,
 * damit Löschen durch den Absender den Fall nicht leert (v2 11.4). Gemeldet
 * werden kann nur, was die meldende Person selbst sieht.
 */
export type ReportResult =
  | { ok: true; reportId: string }
  | { ok: false; reason: "invalid" | "not-found" };

export async function reportMessage(
  userId: string,
  messageId: string,
  input: unknown,
): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(messageId).success)
    return { ok: false, reason: "invalid" };
  const db = getDb();
  const message = await db.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      body: true,
      createdAt: true,
      deletedAt: true,
    },
  });
  if (!message || message.senderId === userId)
    return { ok: false, reason: "not-found" };
  if (!(await participantOf(userId, message.conversationId)))
    return { ok: false, reason: "not-found" };
  const report = await fileReport({
      reporterId: userId,
      targetType: "MESSAGE",
      targetId: message.id,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      evidence: {
        conversationId: message.conversationId,
        senderId: message.senderId,
        sentAt: message.createdAt.toISOString(),
        body: message.deletedAt ? null : message.body,
      } as Prisma.InputJsonValue,
  });
  return { ok: true, reportId: report.reportId };
}

/** Die Gegenseite einer Unterhaltung melden, mit den letzten zehn Nachrichten als Kopie. */
export async function reportCounterpart(
  userId: string,
  conversationId: string,
  input: unknown,
): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const participation = await participantOf(userId, conversationId);
  if (!participation) return { ok: false, reason: "not-found" };
  const db = getDb();
  const recent = await db.message.findMany({
    where: {
      conversationId,
      senderId: participation.counterpartId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, body: true, createdAt: true },
  });
  const report = await fileReport({
      reporterId: userId,
      targetType: participation.role === "MEMBER" ? "PROFILE" : "USER",
      targetId:
        participation.role === "MEMBER"
          ? participation.providerProfileId
          : participation.counterpartId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      evidence: {
        conversationId,
        messages: recent.map((entry) => ({
          id: entry.id,
          body: entry.body,
          sentAt: entry.createdAt.toISOString(),
        })),
      } as Prisma.InputJsonValue,
  });
  return { ok: true, reportId: report.reportId };
}

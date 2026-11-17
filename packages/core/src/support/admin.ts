import { getDb, type Prisma } from "@app/db";
import { z } from "zod";
import { assertPermission, hasPermission } from "../admin/permissions";
import { loadAdminActor } from "../admin/service";
import { sendSupportMail } from "./mail";
import { supportReplySchema, supportStatusSchema, type SupportReplyInput } from "./schemas";

/**
 * Supportanfragen bearbeiten (v2 7.8 `/admin/support`, Recht `support.handle`).
 * Jeder Schritt schreibt einen Audit-Eintrag ohne Text der Anfrage oder der
 * Antwort.
 *
 * Eine Antwort geht im Wortlaut per E-Mail an die anfragende Adresse
 * (Vorlage «support-reply»); interne Notizen nie.
 */
const idSchema = z.string().min(1).max(64);
const target = (id: string) => `support:${id}`;

export type SupportResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" | "not-applicable" };

const listSchema = z.object({
  status: supportStatusSchema.optional(),
  // «me»: mir zugewiesen, «none»: niemandem.
  assigned: z.enum(["me", "none", "any"]).default("any"),
});

/** Anfragen, offene zuerst, dann älteste zuerst; höchstens 200. Ohne Text der Anfrage. */
export async function listSupportTickets(actorId: string, filter: z.input<typeof listSchema> = {}) {
  await assertPermission(actorId, "support.handle");
  const parsed = listSchema.safeParse(filter);
  if (!parsed.success) return [];
  const where: Prisma.SupportTicketWhereInput = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.assigned === "me" ? { assignedToId: actorId } : parsed.data.assigned === "none" ? { assignedToId: null } : {}),
  };
  return getDb().supportTicket.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: {
      id: true,
      number: true,
      category: true,
      subject: true,
      status: true,
      locale: true,
      userId: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { replies: true } },
    },
  });
}

/** Eine Anfrage mit Antworten und internen Notizen. Schreibt `support.viewed`. */
export async function getSupportTicket(actorId: string, id: string) {
  await assertPermission(actorId, "support.handle");
  if (!idSchema.safeParse(id).success) return null;
  const db = getDb();
  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: { replies: { orderBy: { createdAt: "asc" }, select: { id: true, authorId: true, body: true, internal: true, createdAt: true } } },
  });
  if (!ticket) return null;
  const userIds = [...new Set([ticket.userId, ticket.assignedToId, ...ticket.replies.map((reply) => reply.authorId)].filter((value): value is string => Boolean(value)))];
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, accountType: true } });
  const byId = new Map(users.map((user) => [user.id, user]));
  await db.auditEvent.create({ data: { actorId, action: "support.viewed", target: target(id) } });
  return {
    ...ticket,
    account: ticket.userId ? (byId.get(ticket.userId) ?? null) : null,
    replies: ticket.replies.map((reply) => ({ ...reply, authorUsername: byId.get(reply.authorId)?.username ?? null })),
  };
}

/** Antwort an die anfragende Person (Status `ANSWERED`) oder interne Notiz (Status bleibt). */
export async function replyToTicket(actorId: string, id: string, input: SupportReplyInput): Promise<SupportResult> {
  await assertPermission(actorId, "support.handle");
  const parsed = supportReplySchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(id).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const ticket = await db.supportTicket.findUnique({ where: { id }, select: { id: true, email: true, locale: true, number: true } });
  if (!ticket) return { ok: false, reason: "not-found" };
  await db.$transaction(async (tx) => {
    await tx.supportReply.create({ data: { ticketId: id, authorId: actorId, body: parsed.data.body, internal: parsed.data.internal } });
    if (!parsed.data.internal) await tx.supportTicket.update({ where: { id }, data: { status: "ANSWERED" } });
    await tx.auditEvent.create({ data: { actorId, action: parsed.data.internal ? "support.noted" : "support.replied", target: target(id) } });
  });
  // Die Antwort geht an die anfragende Adresse, eine interne Notiz nie.
  if (!parsed.data.internal) await sendSupportMail(ticket, "support-reply", parsed.data.body);
  return { ok: true };
}

export async function setTicketStatus(actorId: string, id: string, status: string): Promise<SupportResult> {
  await assertPermission(actorId, "support.handle");
  const parsed = supportStatusSchema.safeParse(status);
  if (!parsed.success || !idSchema.safeParse(id).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const updated = await db.supportTicket.updateMany({ where: { id }, data: { status: parsed.data } });
  if (updated.count === 0) return { ok: false, reason: "not-found" };
  await db.auditEvent.create({ data: { actorId, action: `support.status_${parsed.data.toLowerCase()}`, target: target(id) } });
  return { ok: true };
}

/** Zuweisen oder freigeben (`assigneeId` null). Wer zugewiesen wird, braucht selbst `support.handle`. */
export async function assignTicket(actorId: string, id: string, assigneeId: string | null): Promise<SupportResult> {
  await assertPermission(actorId, "support.handle");
  if (!idSchema.safeParse(id).success || (assigneeId !== null && !idSchema.safeParse(assigneeId).success)) return { ok: false, reason: "invalid" };
  if (assigneeId && !hasPermission(await loadAdminActor(assigneeId), "support.handle")) return { ok: false, reason: "not-applicable" };
  const db = getDb();
  const updated = await db.supportTicket.updateMany({ where: { id }, data: { assignedToId: assigneeId } });
  if (updated.count === 0) return { ok: false, reason: "not-found" };
  await db.auditEvent.create({ data: { actorId, action: assigneeId ? "support.assigned" : "support.unassigned", target: target(id), reason: assigneeId ? `user:${assigneeId}` : null } });
  return { ok: true };
}

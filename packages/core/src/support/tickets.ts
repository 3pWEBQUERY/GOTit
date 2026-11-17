import { getDb } from "@app/db";
import { z } from "zod";
import { sendSupportMail } from "./mail";
import { supportTicketSchema, type SupportTicketInput } from "./schemas";

export type CreateTicketResult = { ok: true; ticketId: string; number: number } | { ok: false; reason: "invalid" };

/**
 * Legt eine Supportanfrage an (öffentlich, ohne Recht). Mit Konto gilt dessen
 * E-Mail-Adresse, nicht die eingegebene. Das Rate Limit setzt der Aufrufer.
 * Danach geht eine Eingangsbestätigung ohne Inhalt an die Adresse.
 */
export async function createSupportTicket(input: SupportTicketInput): Promise<CreateTicketResult> {
  const parsed = supportTicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { userId, email: typedEmail, ...data } = parsed.data;
  const db = getDb();
  let email = typedEmail;
  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return { ok: false, reason: "invalid" };
    email = user.email;
  }
  const parsedEmail = z.email().safeParse(email);
  if (!parsedEmail.success) return { ok: false, reason: "invalid" };
  const ticket = await db.$transaction(async (tx) => {
    const row = await tx.supportTicket.create({ data: { ...data, userId, email: parsedEmail.data }, select: { id: true, number: true } });
    await tx.auditEvent.create({ data: { actorId: userId, action: "support.created", target: `support:${row.id}`, reason: data.category } });
    return row;
  });
  await sendSupportMail({ email: parsedEmail.data, locale: data.locale, number: ticket.number }, "support-received");
  return { ok: true, ticketId: ticket.id, number: ticket.number };
}

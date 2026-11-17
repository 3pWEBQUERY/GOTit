import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignTicket, createSupportTicket, getSupportTicket, listSupportTickets, replyToTicket, setTicketStatus } from "./index";

/** Supportanfragen gegen Postgres: Eingang, Bearbeitung, Audit ohne Text. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const tickets: string[] = [];
let agent = "";
let editor = "";
let member = "";

async function user(label: string, role?: "SUPPORT" | "CONTENT_EDITOR") {
  const id = `it_sup_${label}_${run}`;
  users.push(id);
  await db.user.create({ data: { id, name: "Fiktiv", email: `${id}@fiktiv.test`, twoFactorEnabled: true } });
  if (role) await db.internalRoleAssignment.create({ data: { userId: id, role, grantedBy: "test" } });
  return id;
}

beforeAll(async () => {
  agent = await user("agent", "SUPPORT");
  editor = await user("redaktion", "CONTENT_EDITOR");
  member = await user("mitglied");
});

afterAll(async () => {
  await db.supportTicket.deleteMany({ where: { id: { in: tickets } } });
  await db.auditEvent.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: tickets.map((id) => `support:${id}`) } }] } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

const secret = "Vertraulicher Text der Anfrage mit Einzelheiten";

describe("Supportanfragen", () => {
  it("nimmt bei Konten deren Adresse und prüft die Eingabe", async () => {
    const created = await createSupportTicket({ userId: member, email: "andere@fiktiv.test", category: "account", subject: "Anmeldung", body: secret, locale: "fr" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    tickets.push(created.ticketId);
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id: created.ticketId } });
    expect(row).toMatchObject({ email: `${member}@fiktiv.test`, locale: "fr", status: "OPEN" });
    expect(await createSupportTicket({ email: "kaputt", category: "other", subject: "Hallo", body: secret })).toEqual({ ok: false, reason: "invalid" });
    expect(await createSupportTicket({ email: "a@fiktiv.test", category: "unbekannt" as never, subject: "Hallo", body: secret })).toEqual({ ok: false, reason: "invalid" });
    expect(await createSupportTicket({ email: "a@fiktiv.test", category: "appeal", subject: "Hallo", body: "zu kurz" })).toEqual({ ok: false, reason: "invalid" });
    const anonymous = await createSupportTicket({ email: "gesperrt@fiktiv.test", category: "appeal", subject: "Einspruch gegen Sperre", body: secret });
    expect(anonymous.ok).toBe(true);
    if (anonymous.ok) tickets.push(anonymous.ticketId);
  });

  it("bearbeitet eine Anfrage: zuweisen, Notiz, Antwort, schliessen", async () => {
    const [id] = tickets as [string];
    expect(await assignTicket(agent, id, editor)).toEqual({ ok: false, reason: "not-applicable" });
    expect(await assignTicket(agent, id, agent)).toEqual({ ok: true });
    expect((await listSupportTickets(agent, { assigned: "me" })).map((ticket) => ticket.id)).toEqual([id]);
    expect(await replyToTicket(agent, id, { body: "Interne Notiz zum Fall", internal: true })).toEqual({ ok: true });
    expect((await db.supportTicket.findUniqueOrThrow({ where: { id } })).status).toBe("OPEN");
    expect(await replyToTicket(agent, id, { body: "Antwort an die Person", internal: false })).toEqual({ ok: true });
    const detail = await getSupportTicket(agent, id);
    expect(detail?.status).toBe("ANSWERED");
    expect(detail?.replies.map((reply) => reply.internal)).toEqual([true, false]);
    expect(detail?.account?.id).toBe(member);
    expect(await setTicketStatus(agent, id, "CLOSED")).toEqual({ ok: true });
    expect(await setTicketStatus(agent, id, "KAPUTT")).toEqual({ ok: false, reason: "invalid" });
    expect((await listSupportTickets(agent, { status: "CLOSED" })).some((ticket) => ticket.id === id)).toBe(true);
  });

  it("protokolliert jeden Schritt ohne Text", async () => {
    const audit = await db.auditEvent.findMany({ where: { target: `support:${tickets[0]}` }, select: { action: true, reason: true } });
    expect(audit.map((row) => row.action).sort()).toEqual(["support.assigned", "support.created", "support.noted", "support.replied", "support.status_closed", "support.viewed"]);
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain("Vertraulich");
    expect(serialized).not.toContain("Antwort an die Person");
  });
});

import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportOwnData } from "./export";

/**
 * Selbstauskunft gegen Postgres (Sicherheitsprüfung 1.14): Der Export enthält
 * die Daten aller Module zum Konto, aber keine Geheimnisse, keine internen
 * Notizen und keine Angaben, wer in der Moderation entschieden hat.
 */
const db = getDb();
const run = `${Date.now()}`;
const userId = `it_export_${run}`;
const staffId = `it_export_staff_${run}`;
const ticketIds: string[] = [];

beforeAll(async () => {
  await db.user.create({ data: { id: staffId, name: "Fiktiv Support", email: `${staffId}@fiktiv.test`, twoFactorEnabled: true } });
  await db.user.create({ data: { id: userId, name: "Fiktiv Export", email: `${userId}@fiktiv.test`, emailVerified: true } });
  await db.account.create({ data: { id: `acc_${run}`, accountId: userId, providerId: "credential", userId, password: "hash-der-nicht-exportiert-wird" } });
  const profile = await db.providerProfile.create({ data: { userId, slug: `fiktiv-export-${run}`, displayName: "Fiktiv Export", description: "Eigene Beschreibung" } });
  await db.identityCheck.create({ data: { userId, provider: "test", externalRef: `geheime-ref-${run}`, status: "APPROVED", ageOver18: true, livenessPassed: true, checkedAt: new Date() } });
  await db.mediaAsset.create({ data: { ownerUserId: userId, providerProfileId: profile.id, status: "PUBLISHED", originalKey: `it-export-${run}`, rightsConfirmedAt: new Date(), altText: "Eigenes Bild" } });
  await db.collection.create({ data: { userId, name: "Merkliste Fiktiv", items: { create: { providerProfileId: profile.id } } } });
  await db.savedSearch.create({ data: { userId, name: "Suche Fiktiv", query: { region: "zuerich" }, queryKey: `k-${run}` } });
  await db.accountRestriction.create({ data: { userId, kind: "MESSAGING", rule: "R-MOD-1", reason: "Fiktive Begründung der Einschränkung", createdById: staffId } });
  await db.report.create({ data: { reporterId: userId, targetType: "URL", targetId: "/de/x", reason: "spam", details: "Eigene Meldung", evidence: { body: "Beweis eines Dritten" } } });
  const ticket = await db.supportTicket.create({
    data: {
      userId,
      email: `${userId}@fiktiv.test`,
      category: "account",
      subject: "Frage Fiktiv",
      body: "Eigene Anfrage",
      locale: "de",
      replies: { create: [{ authorId: staffId, body: "Antwort an die Person" }, { authorId: staffId, body: "Interne Notiz Fiktiv", internal: true }] },
    },
  });
  ticketIds.push(ticket.id);
});

afterAll(async () => {
  await db.report.deleteMany({ where: { reporterId: userId } });
  await db.supportTicket.deleteMany({ where: { id: { in: ticketIds } } });
  await db.user.deleteMany({ where: { id: { in: [userId, staffId] } } });
});

describe("Datenexport (PRD 16.2, revDSG Art. 25)", () => {
  it("enthält die Daten aller Module, ohne Geheimnisse und interne Angaben", async () => {
    const data = await exportOwnData(userId);
    const account = data.account;
    expect(account.providerProfile).toMatchObject({ description: "Eigene Beschreibung" });
    expect(account.identityChecks).toEqual([expect.objectContaining({ status: "APPROVED", ageOver18: true })]);
    expect(account.media).toEqual([expect.objectContaining({ altText: "Eigenes Bild" })]);
    expect(account.collections[0]).toMatchObject({ name: "Merkliste Fiktiv", items: [{ providerProfile: { slug: `fiktiv-export-${run}` } }] });
    expect(account.savedSearches).toEqual([expect.objectContaining({ name: "Suche Fiktiv" })]);
    expect(account.restrictions).toEqual([expect.objectContaining({ kind: "MESSAGING", reason: "Fiktive Begründung der Einschränkung" })]);
    expect(account.reports).toEqual([expect.objectContaining({ reason: "spam", details: "Eigene Meldung" })]);
    expect(account.supportTickets).toEqual([expect.objectContaining({ body: "Eigene Anfrage", replies: [expect.objectContaining({ body: "Antwort an die Person" })] })]);
    expect(account.bookingRequests).toEqual([]);

    const json = JSON.stringify(data);
    for (const hidden of ["hash-der-nicht-exportiert-wird", `geheime-ref-${run}`, "Interne Notiz Fiktiv", "Beweis eines Dritten", staffId]) expect(json).not.toContain(hidden);
  });
});

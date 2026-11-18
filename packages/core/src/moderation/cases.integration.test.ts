import { getDb, type InternalRole } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

const redisCalls = vi.hoisted(() => [] as string[][]);
vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => {
    const pipeline = {
      set: (...args: string[]) => (redisCalls.push(["set", ...args.map(String)]), pipeline),
      del: (key: string) => (redisCalls.push(["del", key]), pipeline),
      exec: async () => [],
    };
    return { publish: async () => 0, multi: () => pipeline };
  },
}));

const moderation = await import("./index");
const messaging = await import("../messaging/index");
const booking = await import("../booking/index");
const mediaDelivery = await import("../media/index");

/**
 * Allgemeine Moderation gegen Postgres (Schritt 1.13, Abnahme 20.6 aus
 * v1.0): Rollenrechte in jeder Funktion, protokollierte Entscheide,
 * zuverlässig verborgene Inhalte, Sperren mit Ende und Einspruch. Konten
 * und Profile sind fiktiv und werden danach gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
let clientCounter = 0;
const clientId = () => `c${run}x${(clientCounter += 1)}`;
const reason = "Fiktive Begründung für den Test, ausreichend lang.";

function account(id: string): Extract<Viewer, { kind: "account" }> {
  return { kind: "account", userId: id, name: "Fiktiv", ageConfirmed: true, provider: null, organizations: [] };
}

// Konten der Tests sind «etabliert»: älter als die 7 Tage, ab denen eine kritische Meldung sofort sperrt.
const ESTABLISHED = new Date(Date.now() - 30 * 86_400_000);

async function user(label: string, roles: InternalRole[] = [], twoFactor = true, extra: { createdAt?: Date; emailVerified?: boolean } = {}) {
  const id = `it_case_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: `Fiktiv ${label}`,
      email: `${id}@fiktiv.test`,
      emailVerified: extra.emailVerified ?? true,
      createdAt: extra.createdAt ?? ESTABLISHED,
      ageConfirmedAt: new Date(),
      twoFactorEnabled: twoFactor,
      username: `f_${label}_${run}`.slice(0, 30),
    },
  });
  for (const role of roles) await db.internalRoleAssignment.create({ data: { userId: id, role, grantedBy: "test" } });
  return id;
}

async function provider(label: string) {
  const id = await user(label);
  const profile = await db.providerProfile.create({
    data: { userId: id, slug: `fiktiv-case-${label}-${run}`, displayName: `Fiktiv ${label}`, status: "PUBLISHED", allowMessages: true },
  });
  await db.identityCheck.create({
    data: {
      userId: id,
      provider: "test",
      externalRef: `it-case-${label}-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 100 * 86_400_000),
    },
  });
  await db.profileReview.create({ data: { providerProfileId: profile.id, decision: "APPROVED", decidedAt: new Date() } });
  return { userId: id, slug: profile.slug, profileId: profile.id };
}

async function conversationWithMessage(memberId: string, slug: string, body: string) {
  const started = await messaging.startConversation(account(memberId), slug);
  if (!started.ok) throw new Error(started.reason);
  const sent = await messaging.sendMessage(account(memberId), started.conversationId, { body, clientId: clientId() });
  if (!sent.ok) throw new Error(sent.reason);
  return { conversationId: started.conversationId, messageId: sent.messageId };
}

let member = "";
let other = "";
let anbieter: Awaited<ReturnType<typeof provider>>;
let moderator = "";
let moderator2 = "";
let trustSafety = "";
let trustSafety2 = "";
let support = "";
let noTwoFactor = "";

beforeAll(async () => {
  member = await user("mitglied");
  other = await user("andere");
  anbieter = await provider("anbieter");
  moderator = await user("moderation", ["MODERATOR"]);
  moderator2 = await user("moderation2", ["MODERATOR"]);
  trustSafety = await user("ts", ["TRUST_SAFETY"]);
  trustSafety2 = await user("ts2", ["TRUST_SAFETY"]);
  support = await user("support", ["SUPPORT"]);
  noTwoFactor = await user("ohne2fa", ["SUPER_ADMIN"], false);
});

afterAll(async () => {
  const reports = await db.report.findMany({ where: { OR: [{ reporterId: { in: users } }, { targetUrl: { contains: run } }] }, select: { id: true } });
  await db.auditEvent.deleteMany({ where: { target: { in: reports.map((report) => `report:${report.id}`) } } });
  await db.report.deleteMany({ where: { id: { in: reports.map((report) => report.id) } } });
  await db.auditEvent.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: users.map((id) => `user:${id}`) } }] } });
  await db.conversation.deleteMany({ where: { participants: { some: { userId: { in: users } } } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Eingang und Sofortsperre (v2 12.4)", () => {
  it("kritischer Grund: höchste Priorität, eskaliert, Nachricht für beide Seiten ausgeblendet", async () => {
    const { conversationId, messageId } = await conversationWithMessage(other, anbieter.slug, "Fiktiver kritischer Inhalt");
    const reported = await messaging.reportMessage(anbieter.userId, messageId, { reason: "minor", details: "" });
    if (!reported.ok) throw new Error(reported.reason);
    const report = await db.report.findUniqueOrThrow({ where: { id: reported.reportId } });
    expect(report.priority).toBe("CRITICAL");
    expect(report.escalatedAt).not.toBeNull();
    expect(report.contentBlockedAt).not.toBeNull();
    for (const viewer of [other, anbieter.userId]) {
      const thread = await messaging.getThread(viewer, conversationId);
      const message = thread?.messages.find((entry) => entry.id === messageId);
      expect(message).toMatchObject({ body: null, hidden: true, attachments: [] });
    }
    const inbox = await messaging.listInbox(anbieter.userId, { q: "kritischer" });
    expect(inbox.some((entry) => entry.conversationId === conversationId)).toBe(false);
    const audit = await db.auditEvent.findMany({ where: { target: `report:${report.id}` }, select: { action: true, reason: true } });
    expect(audit.map((entry) => entry.action).sort()).toEqual(["report.content_blocked", "report.escalated"]);
    expect(JSON.stringify(audit)).not.toContain("Fiktiver kritischer Inhalt");
  });

  it("Meldung ohne Konto: Profil aus der Adresse zugeordnet, nichts automatisch gesperrt; fremde Hosts abgelehnt", async () => {
    const filed = await moderation.fileAnonymousReport(
      { url: `https://thegnd.net/de/p/${anbieter.slug}?run=${run}`, reason: "exploitation", details: `Fiktiv ${run}`, contactEmail: "" },
      ["thegnd.net"],
    );
    if (!filed.ok) throw new Error(filed.reason);
    const report = await db.report.findUniqueOrThrow({ where: { id: filed.reportId } });
    expect(report).toMatchObject({ reporterId: null, targetType: "PROFILE", targetId: anbieter.profileId, priority: "CRITICAL", contentBlockedAt: null });
    expect(report.escalatedAt).not.toBeNull();
    expect((await db.providerProfile.findUniqueOrThrow({ where: { id: anbieter.profileId } })).status).toBe("PUBLISHED");
    await db.report.update({ where: { id: report.id }, data: { targetUrl: `/de/p/${anbieter.slug}#${run}` } });
    expect(await moderation.fileAnonymousReport({ url: "https://example.org/x", reason: "spam" }, ["thegnd.net"])).toEqual({ ok: false, reason: "foreign-url" });
  });
});

describe("Sofortsperre nur durch vertrauenswürdige Konten (Sicherheitsprüfung 1.14)", () => {
  it("neues oder unbestätigtes Konto: eskaliert, sperrt aber nichts; höchstens 3 Sofortsperren pro Tag", async () => {
    const fresh = await user("neu", [], true, { createdAt: new Date() });
    const unverified = await user("unbest", [], true, { emailVerified: false });
    const serial = await user("serie");
    const [first, ...others] = await Promise.all(["z1", "z2", "z3", "z4", "z5"].map((label) => provider(label)));
    if (!first || others.length !== 4) throw new Error("Profile fehlen");
    const status = async (profileId: string) => (await db.providerProfile.findUniqueOrThrow({ where: { id: profileId } })).status;

    for (const reporterId of [fresh, unverified]) {
      const filed = await moderation.fileReport({ reporterId, targetType: "PROFILE", targetId: first.profileId, reason: "minor", details: null });
      expect(filed.blocked).toBe(false);
      const report = await db.report.findUniqueOrThrow({ where: { id: filed.reportId } });
      expect(report).toMatchObject({ priority: "CRITICAL", contentBlockedAt: null });
      expect(report.escalatedAt).not.toBeNull();
    }
    expect(await status(first.profileId)).toBe("PUBLISHED");

    const outcomes = [];
    for (const target of others) {
      outcomes.push((await moderation.fileReport({ reporterId: serial, targetType: "PROFILE", targetId: target.profileId, reason: "exploitation", details: null })).blocked);
    }
    expect(outcomes).toEqual([true, true, true, false]);
    expect((await Promise.all(others.map((target) => status(target.profileId))))).toEqual(["SUSPENDED", "SUSPENDED", "SUSPENDED", "PUBLISHED"]);
  });
});

describe("Entscheide (20.6)", () => {
  it("kritische Fälle entscheidet nur Trust & Safety; «Kein Verstoss» stellt die Nachricht wieder her", async () => {
    const { conversationId, messageId } = await conversationWithMessage(member, anbieter.slug, "Fiktiv wiederherstellen");
    const reported = await messaging.reportMessage(anbieter.userId, messageId, { reason: "danger", details: "" });
    if (!reported.ok) throw new Error(reported.reason);
    const input = { decision: "NO_ACTION" as const, rule: "R-MOD-0" as const, reason };
    await expect(moderation.decideCase(moderator, reported.reportId, input)).rejects.toThrow(/^forbidden:/);
    expect(await moderation.nextCase(moderator)).not.toBe(reported.reportId);
    expect(await moderation.assignCase(moderator, reported.reportId, moderator2)).toEqual({ ok: false, reason: "not-applicable" });
    expect(await moderation.decideCase(trustSafety, reported.reportId, input)).toEqual({ ok: true });
    const thread = await messaging.getThread(member, conversationId);
    expect(thread?.messages.find((entry) => entry.id === messageId)).toMatchObject({ body: "Fiktiv wiederherstellen", hidden: false });
    const audit = await db.auditEvent.findFirstOrThrow({ where: { target: `report:${reported.reportId}`, action: "report.decided.no_action" } });
    expect(audit).toMatchObject({ actorId: trustSafety, reason: `R-MOD-0: ${reason}` });
  });

  it("Regel und Begründung sind Pflicht; Entscheide passen zum Ziel; zwei gleichzeitige ergeben einen Gewinner", async () => {
    const { messageId } = await conversationWithMessage(other, anbieter.slug, "Fiktiv gleichzeitig");
    const reported = await messaging.reportMessage(anbieter.userId, messageId, { reason: "harassment", details: "" });
    if (!reported.ok) throw new Error(reported.reason);
    const id = reported.reportId;
    expect(await moderation.decideCase(moderator, id, { decision: "CONTENT_REMOVED", rule: "R-MOD-1", reason: "kurz" })).toEqual({ ok: false, reason: "invalid" });
    expect(await moderation.decideCase(moderator, id, { decision: "CONTENT_REMOVED", rule: "R-MOD-0", reason })).toEqual({ ok: false, reason: "invalid" });
    expect(await moderation.decideCase(moderator, id, { decision: "CHANGES_REQUESTED", rule: "R-MOD-1", reason })).toEqual({ ok: false, reason: "not-applicable" });
    const results = await Promise.all([
      moderation.decideCase(moderator, id, { decision: "CONTENT_REMOVED", rule: "R-MOD-1", reason }),
      moderation.decideCase(moderator2, id, { decision: "NO_ACTION", rule: "R-MOD-0", reason }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "already-decided" }]);
  });

  it("entferntes Medium ist nicht mehr öffentlich; Einspruch des Inhabers bei einer anderen Person stellt es wieder her", async () => {
    const media = await db.mediaAsset.create({ data: { ownerUserId: anbieter.userId, providerProfileId: anbieter.profileId, status: "PUBLISHED", originalKey: `it-case-${run}`, rightsConfirmedAt: new Date() } });
    const report = await moderation.fileReport({ reporterId: member, targetType: "MEDIA", targetId: media.id, reason: "impersonation", details: null });
    expect((await db.report.findUniqueOrThrow({ where: { id: report.reportId } })).priority).toBe("HIGH");
    expect(await moderation.decideCase(moderator, report.reportId, { decision: "CONTENT_REMOVED", rule: "R-MOD-3", reason })).toEqual({ ok: true });
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: media.id } })).status).toBe("BLOCKED");
    // Geschützte Vorschau zum Fall: nur mit Zugang, jeder Abruf im Audit-Log; öffentlich nichts.
    await db.mediaVariant.create({ data: { mediaId: media.id, name: "w960.webp", width: 960, height: 1200, format: "webp", key: `it-case-variant-${run}`, bytes: 1 } });
    expect(await mediaDelivery.resolveMediaDelivery(media.id, "w960.webp", member)).toBeNull();
    expect(await mediaDelivery.resolveReportPreview(report.reportId, "w960.webp", support)).toBeNull();
    expect(await mediaDelivery.resolveReportPreview(report.reportId, "w960.webp", moderator)).toMatchObject({ access: "private", key: `it-case-variant-${run}` });
    expect(await db.auditEvent.count({ where: { target: `report:${report.reportId}`, action: "report.media_previewed", actorId: moderator } })).toBe(1);
    expect(await moderation.appealCase(member, report.reportId, "Fiktiver Einspruch einer fremden Person.")).toEqual({ ok: false, reason: "not-found" });
    expect(await moderation.appealCase(anbieter.userId, report.reportId, "Fiktiver Einspruch des Inhabers, lang genug.")).toEqual({ ok: true });
    expect(await moderation.appealCase(anbieter.userId, report.reportId, "Fiktiver zweiter Einspruch, lang genug.")).toEqual({ ok: false, reason: "already-decided" });
    expect(await moderation.decideCaseAppeal(moderator, report.reportId, { outcome: "UPHELD", reason })).toEqual({ ok: false, reason: "same-person" });
    expect(await moderation.decideCaseAppeal(moderator2, report.reportId, { outcome: "UPHELD", reason })).toEqual({ ok: true });
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: media.id } })).status).toBe("PUBLISHED");
  });
});

describe("Sperren und Einschränkungen (v1 9.2)", () => {
  it("Sperre: nur mit Recht; Profil nicht öffentlich, Sitzungen beendet, auch im Zwischenspeicher; Aufheben stellt es wieder her", async () => {
    const target = await provider("gesperrt");
    await db.session.create({ data: { id: `s_${run}`, token: `tok_${run}`, userId: target.userId, expiresAt: new Date(Date.now() + 86_400_000) } });
    const input = { userId: target.userId, kind: "SUSPENDED" as const, rule: "R-MOD-2" as const, reason };
    await expect(moderation.restrictAccount(moderator, input)).rejects.toThrow(/^forbidden:/);
    const result = await moderation.restrictAccount(trustSafety, input);
    if (!result.ok) throw new Error(result.reason);
    expect((await db.providerProfile.findUniqueOrThrow({ where: { id: target.profileId } })).status).toBe("SUSPENDED");
    expect(await db.session.count({ where: { userId: target.userId } })).toBe(0);
    expect(redisCalls).toContainEqual(["del", `auth:tok_${run}`]);
    expect(redisCalls.some((call) => call[0] === "set" && call[1] === `auth:revoked-sessions-before-${target.userId}`)).toBe(true);
    expect(await moderation.isRestricted(target.userId, "MESSAGING")).toBe(true);
    expect(await moderation.restrictAccount(trustSafety2, input)).toEqual({ ok: false, reason: "already-active" });
    expect(await moderation.liftRestriction(trustSafety, result.restrictionId, reason)).toEqual({ ok: true });
    expect((await db.providerProfile.findUniqueOrThrow({ where: { id: target.profileId } })).status).toBe("PUBLISHED");
    expect(await moderation.isRestricted(target.userId, "SUSPENDED")).toBe(false);
  });

  it("befristete Einschränkung der Nachrichten wirkt sofort und endet von selbst", async () => {
    const target = await user("befristet");
    const { conversationId } = await conversationWithMessage(target, anbieter.slug, "Fiktiv vor der Einschränkung");
    const now = new Date();
    const until = new Date(now.getTime() + 3600_000);
    expect(await moderation.restrictAccount(moderator, { userId: target, kind: "MESSAGING", rule: "R-MOD-1", reason, until: new Date(now.getTime() - 1000) })).toEqual({ ok: false, reason: "past-end" });
    const result = await moderation.restrictAccount(moderator, { userId: target, kind: "MESSAGING", rule: "R-MOD-1", reason, until });
    expect(result.ok).toBe(true);
    expect(await messaging.sendMessage(account(target), conversationId, { body: "Fiktiv", clientId: clientId() })).toEqual({ ok: false, reason: "restricted" });
    expect(await messaging.startConversation(account(target), anbieter.slug)).toEqual({ ok: false, reason: "restricted" });
    expect((await moderation.listOwnRestrictions(target)).map((entry) => entry.kind)).toEqual(["MESSAGING"]);
    expect(await moderation.expireRestrictions(new Date(until.getTime() + 1000))).toBeGreaterThanOrEqual(1);
    const sent = await messaging.sendMessage(account(target), conversationId, { body: "Fiktiv danach", clientId: clientId() });
    expect(sent.ok).toBe(true);
  });

  it("Termine eingeschränkt: keine Anfrage, Absagen bleibt", async () => {
    const target = await user("termine");
    const result = await moderation.restrictAccount(moderator, { userId: target, kind: "BOOKING", rule: "R-MOD-2", reason });
    expect(result.ok).toBe(true);
    const request = await booking.createBookingRequest(account(target), anbieter.slug, { startsAt: new Date(Date.now() + 7 * 86_400_000), durationMinutes: 60, message: "" });
    expect(request).toEqual({ ok: false, reason: "restricted" });
  });

  it("Einspruch des Kontos einmal; Entscheid nicht durch die verhängende Person", async () => {
    const target = await user("einspruch");
    const result = await moderation.restrictAccount(moderator, { userId: target, kind: "MESSAGING", rule: "R-MOD-1", reason });
    if (!result.ok) throw new Error(result.reason);
    expect(await moderation.appealRestriction(other, result.restrictionId, "Fiktiver fremder Einspruch, lang genug.")).toEqual({ ok: false, reason: "not-found" });
    expect(await moderation.appealRestriction(target, result.restrictionId, "Fiktiver Einspruch, lang genug für den Test.")).toEqual({ ok: true });
    expect(await moderation.appealRestriction(target, result.restrictionId, "Fiktiver zweiter Einspruch, lang genug.")).toEqual({ ok: false, reason: "already" });
    expect((await moderation.listRestrictionAppeals(moderator2)).some((entry) => entry.id === result.restrictionId)).toBe(true);
    expect(await moderation.decideRestrictionAppeal(moderator, result.restrictionId, { outcome: "UPHELD", reason })).toEqual({ ok: false, reason: "same-person" });
    expect(await moderation.decideRestrictionAppeal(moderator2, result.restrictionId, { outcome: "UPHELD", reason })).toEqual({ ok: true });
    expect(await moderation.isRestricted(target, "MESSAGING")).toBe(false);
  });

  it("niemand schränkt sich selbst oder interne Konten ohne Super-Admin ein", async () => {
    expect(await moderation.restrictAccount(moderator, { userId: moderator, kind: "MESSAGING", rule: "R-MOD-1", reason })).toEqual({ ok: false, reason: "self" });
    expect(await moderation.restrictAccount(moderator, { userId: support, kind: "MESSAGING", rule: "R-MOD-1", reason })).toEqual({ ok: false, reason: "protected" });
  });
});

describe("Rollenrechte in jeder Funktion (20.6)", () => {
  it("Mitglied, Support und Konto ohne 2FA scheitern überall, auch mit ungültiger Eingabe", async () => {
    const calls: ((actor: string) => Promise<unknown>)[] = [
      (actor) => moderation.listReports(actor),
      (actor) => moderation.countOpenReports(actor),
      (actor) => moderation.getReport(actor, "x"),
      (actor) => moderation.caseAccountHistory(actor, "x"),
      (actor) => moderation.assignCase(actor, "x", null),
      (actor) => moderation.nextCase(actor),
      (actor) => moderation.decideCase(actor, "x", { decision: "NO_ACTION", rule: "R-MOD-0", reason }),
      (actor) => moderation.decideCase(actor, "x", {} as never),
      (actor) => moderation.decideCaseAppeal(actor, "x", { outcome: "UPHELD", reason }),
      (actor) => moderation.restrictAccount(actor, { userId: member, kind: "MESSAGING", rule: "R-MOD-1", reason }),
      (actor) => moderation.restrictAccount(actor, { userId: member, kind: "SUSPENDED", rule: "R-MOD-1", reason }),
      (actor) => moderation.liftRestriction(actor, "x", reason),
      (actor) => moderation.decideRestrictionAppeal(actor, "x", { outcome: "UPHELD", reason }),
      (actor) => moderation.listRestrictionAppeals(actor),
    ];
    for (const actor of [member, support, noTwoFactor, "unbekannt"]) {
      for (const call of calls) await expect(call(actor)).rejects.toThrow(/^forbidden:/);
    }
  });
});

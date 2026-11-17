import { getDb, type InternalRole } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  countOpenReports,
  getReport,
  listReports,
  reportExists,
  revealReportEvidence,
} from "./index";

/**
 * Übergabe an die Moderation (v1 20.4, v2 12.4) gegen Postgres. Konten und
 * Meldungen sind fiktiv; die Prüfung der Reihenfolge beschränkt sich auf die
 * hier angelegten Fälle, damit fremde Testdaten nicht stören.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const reports: string[] = [];

async function user(
  label: string,
  role?: InternalRole,
  twoFactor = true,
  username: string | null = null,
) {
  const id = `it_mod_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: `Registrierter Name ${label}`,
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      twoFactorEnabled: twoFactor,
      username,
    },
  });
  if (role)
    await db.internalRoleAssignment.create({
      data: { userId: id, role, grantedBy: "test" },
    });
  return id;
}

async function report(data: {
  reporterId: string;
  targetId: string;
  urgent: boolean;
  minutesAgo: number;
  status?: "OPEN" | "RESOLVED";
  evidence?: object;
}) {
  const created = await db.report.create({
    data: {
      reporterId: data.reporterId,
      targetType: "USER",
      targetId: data.targetId,
      reason: data.urgent ? "minor" : "spam",
      details: "Fiktiver Meldetext",
      urgent: data.urgent,
      status: data.status ?? "OPEN",
      createdAt: new Date(Date.now() - data.minutesAgo * 60_000),
      evidence: data.evidence ?? {
        conversationId: "fiktiv",
        messages: [
          {
            id: "m1",
            body: "Fiktiver privater Inhalt",
            sentAt: new Date().toISOString(),
          },
        ],
      },
    },
    select: { id: true },
  });
  reports.push(created.id);
  return created.id;
}

let moderator = "";
let trustSafety = "";
let platformAdmin = "";
let support = "";
let noTwoFactor = "";
let member = "";
let reporter = "";
let target = "";
let oldNormal = "";
let newNormal = "";
let oldUrgent = "";
let newUrgent = "";
let resolved = "";

beforeAll(async () => {
  moderator = await user("moderation", "MODERATOR");
  trustSafety = await user("trust", "TRUST_SAFETY");
  platformAdmin = await user("plattform", "PLATFORM_ADMIN");
  support = await user("support", "SUPPORT");
  noTwoFactor = await user("ohne2fa", "MODERATOR", false);
  member = await user("mitglied");
  reporter = await user(
    "meldend",
    undefined,
    false,
    `fiktiv_meldend_${run}`.slice(0, 30),
  );
  target = await user("gemeldet", undefined, false);
  oldNormal = await report({
    reporterId: reporter,
    targetId: target,
    urgent: false,
    minutesAgo: 300,
  });
  newNormal = await report({
    reporterId: reporter,
    targetId: target,
    urgent: false,
    minutesAgo: 10,
  });
  newUrgent = await report({
    reporterId: reporter,
    targetId: target,
    urgent: true,
    minutesAgo: 5,
  });
  oldUrgent = await report({
    reporterId: reporter,
    targetId: target,
    urgent: true,
    minutesAgo: 200,
  });
  resolved = await report({
    reporterId: reporter,
    targetId: target,
    urgent: true,
    minutesAgo: 900,
    status: "RESOLVED",
  });
});

afterAll(async () => {
  await db.report.deleteMany({ where: { id: { in: reports } } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

const ours = (ids: string[]) => ids.filter((id) => reports.includes(id));

describe("Warteschlange der Meldungen", () => {
  it("dringende zuerst, darin die älteste zuerst; nur offene", async () => {
    const queue = await listReports(moderator);
    expect(ours(queue.map((entry) => entry.id))).toEqual([
      oldUrgent,
      newUrgent,
      oldNormal,
      newNormal,
    ]);
    expect(queue.some((entry) => entry.id === resolved)).toBe(false);
    const done = await listReports(moderator, { status: "RESOLVED" });
    expect(ours(done.map((entry) => entry.id))).toEqual([resolved]);
    expect(await countOpenReports(moderator)).toBeGreaterThanOrEqual(4);
  });

  it("Moderation, Trust & Safety und Plattform-Administration dürfen, Support und andere nicht", async () => {
    for (const actor of [moderator, trustSafety, platformAdmin]) {
      await expect(listReports(actor)).resolves.toBeInstanceOf(Array);
    }
    for (const actor of [support, member, noTwoFactor, "unbekannt"]) {
      await expect(listReports(actor)).rejects.toThrow(/^forbidden:/);
      await expect(getReport(actor, oldNormal)).rejects.toThrow(/^forbidden:/);
      await expect(reportExists(actor, oldNormal)).rejects.toThrow(
        /^forbidden:/,
      );
      await expect(
        revealReportEvidence(actor, oldNormal, "Fiktiver Grund für den Test"),
      ).rejects.toThrow();
      await expect(countOpenReports(actor)).rejects.toThrow(/^forbidden:/);
    }
    await expect(listReports(noTwoFactor)).rejects.toThrow(
      "forbidden:two-factor-required",
    );
    expect(
      await db.auditEvent.count({
        where: { actorId: { in: [support, member, noTwoFactor] } },
      }),
    ).toBe(0);
  });
});

describe("Einzelfall", () => {
  it("jeder Abruf schreibt einen Audit-Eintrag ohne Inhalt, die Kopie bleibt verdeckt", async () => {
    const view = await getReport(moderator, oldNormal);
    expect(view).toMatchObject({
      id: oldNormal,
      reason: "spam",
      details: "Fiktiver Meldetext",
      reporter: { exists: true, name: `fiktiv_meldend_${run}`.slice(0, 30) },
      target: { exists: true, name: null },
      evidence: { kind: "conversation", count: 1 },
    });
    expect(JSON.stringify(view)).not.toContain("Fiktiver privater Inhalt");
    expect(JSON.stringify(view)).not.toContain("Registrierter Name");
    await getReport(moderator, oldNormal);
    const audits = await db.auditEvent.findMany({
      where: { actorId: moderator, target: `report:${oldNormal}` },
    });
    expect(audits.map((entry) => entry.action)).toEqual([
      "report.viewed",
      "report.viewed",
    ]);
    expect(audits.every((entry) => entry.reason === null)).toBe(true);
  });

  it("unbekannte IDs ergeben null, ohne Audit-Eintrag", async () => {
    expect(await getReport(moderator, "unbekannt")).toBeNull();
    expect(await getReport(moderator, "x".repeat(65))).toBeNull();
    expect(await reportExists(moderator, "unbekannt")).toBe(false);
    expect(await reportExists(moderator, oldNormal)).toBe(true);
    expect(
      await revealReportEvidence(
        moderator,
        "unbekannt",
        "Fiktiver Grund für den Test",
      ),
    ).toBeNull();
    expect(
      await db.auditEvent.count({
        where: { actorId: moderator, target: "report:unbekannt" },
      }),
    ).toBe(0);
  });

  it("Aufdecken verlangt einen Grund und protokolliert ihn", async () => {
    await expect(
      revealReportEvidence(trustSafety, newUrgent, "kurz"),
    ).rejects.toThrow();
    const evidence = await revealReportEvidence(
      trustSafety,
      newUrgent,
      "Prüfung der gemeldeten Nachrichten",
    );
    expect(evidence).toMatchObject({
      kind: "conversation",
      messages: [{ body: "Fiktiver privater Inhalt" }],
    });
    const audits = await db.auditEvent.findMany({
      where: { actorId: trustSafety, target: `report:${newUrgent}` },
    });
    expect(audits).toMatchObject([
      {
        action: "report.evidence_revealed",
        reason: "Prüfung der gemeldeten Nachrichten",
      },
    ]);
  });

  it("eine gemeldete Nachricht nennt den Absender, ein gelöschtes Konto erscheint als nicht mehr vorhanden", async () => {
    const sender = await user(
      "absender",
      undefined,
      false,
      `fiktiv_absender_${run}`.slice(0, 30),
    );
    const id = (
      await db.report.create({
        data: {
          reporterId: null,
          targetType: "MESSAGE",
          targetId: "nachricht",
          reason: "scam",
          evidence: {
            conversationId: "fiktiv",
            senderId: sender,
            sentAt: new Date().toISOString(),
            body: "Fiktiver Betrug",
          },
        },
        select: { id: true },
      })
    ).id;
    reports.push(id);
    expect(await getReport(platformAdmin, id)).toMatchObject({
      targetType: "MESSAGE",
      reporter: { exists: false },
      target: { exists: true, name: `fiktiv_absender_${run}`.slice(0, 30) },
      evidence: { kind: "message", count: 1 },
    });
    expect(
      await revealReportEvidence(
        platformAdmin,
        id,
        "Prüfung der gemeldeten Nachricht",
      ),
    ).toMatchObject({ kind: "message", body: "Fiktiver Betrug" });
  });
});

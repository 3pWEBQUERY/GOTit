import { getDb, type InternalRole } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformOverview } from "./dashboard";
import { AdminForbiddenError } from "./permissions";
import { closeServiceStatusConnection, getServiceStatus, listAuditEvents, listFeatureFlags, setFeatureFlag } from "./system";
import { getUserDetail, listInternalStaff, searchUsers, setInternalRoles } from "./users";

/** Nutzerverwaltung, Übersicht und System gegen Postgres und Redis, mit fiktiven Konten. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];

async function user(label: string, roles: InternalRole[] = [], extra: { username?: string } = {}) {
  const id = `it_admf_${label}_${run}`;
  users.push(id);
  await db.user.create({ data: { id, name: `Fiktiv ${label}`, email: `${id}@fiktiv.test`, emailVerified: true, twoFactorEnabled: true, username: extra.username ?? null } });
  if (roles.length) await db.internalRoleAssignment.createMany({ data: roles.map((role) => ({ userId: id, role, grantedBy: "test" })) });
  return id;
}

let superA = "";
let superB = "";
let support = "";
let moderator = "";
let platform = "";
let member = "";
let suspended = "";
let flagBefore: { enabled: boolean; disabledRegions: string[] } | null = null;

beforeAll(async () => {
  superA = await user("super_a", ["SUPER_ADMIN"]);
  superB = await user("super_b", ["SUPER_ADMIN"]);
  support = await user("support", ["SUPPORT"]);
  moderator = await user("moderation", ["MODERATOR"]);
  platform = await user("plattform", ["PLATFORM_ADMIN"]);
  member = await user("mitglied", [], { username: `fiktiv_m_${run}`.slice(0, 30) });
  suspended = await user("gesperrt");
  await db.accountRestriction.create({ data: { userId: suspended, kind: "SUSPENDED", rule: "R-MOD-1", reason: "Fiktive Sperre für den Test", createdById: superA } });
  await db.accountRestriction.create({
    data: { userId: suspended, kind: "MESSAGING", rule: "R-MOD-1", reason: "Fiktiv, schon aufgehoben", createdById: superA, liftedAt: new Date(), liftReason: "Test" },
  });
  await db.identityCheck.create({ data: { userId: member, provider: "test", externalRef: `it_admf_ref_${run}`, status: "APPROVED", checkedAt: new Date() } });
  await db.report.create({ data: { reporterId: suspended, targetType: "USER", targetId: member, reason: "spam" } });
  await db.securityEvent.create({ data: { userId: member, type: "PASSWORD_CHANGED", device: "Firefox auf Linux" } });
  const row = await db.featureFlag.findUnique({ where: { key: "community" } });
  flagBefore = row ? { enabled: row.enabled, disabledRegions: row.disabledRegions } : null;
});

afterAll(async () => {
  if (flagBefore) await db.featureFlag.update({ where: { key: "community" }, data: flagBefore });
  else await db.featureFlag.deleteMany({ where: { key: "community" } });
  await db.report.deleteMany({ where: { targetId: member } });
  await db.auditEvent.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: users.map((id) => `user:${id}`) } }] } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await closeServiceStatusConnection();
});

describe("Nutzer suchen und ansehen", () => {
  it("findet nach Benutzername und exakter ID und zeigt aktive Einschränkungen", async () => {
    const byName = await searchUsers(support, { q: `fiktiv_m_${run}` });
    expect(byName.users.map((entry) => entry.id)).toEqual([member]);
    const byId = await searchUsers(support, { q: suspended });
    expect(byId.users[0]?.restrictions).toEqual(["BOOKING", "MESSAGING", "SUSPENDED"]);
    const filtered = await searchUsers(support, { q: `it_admf_`, filter: "suspended" });
    expect(filtered.users.map((entry) => entry.id)).toContain(suspended);
    expect(filtered.users.map((entry) => entry.id)).not.toContain(member);
    const internal = await searchUsers(support, { q: run, filter: "internal" });
    expect(internal.users.map((entry) => entry.id).sort()).toEqual([superA, superB, support, moderator, platform].sort());
  });

  it("blättert mit Cursor ohne Überschneidung", async () => {
    const first = await searchUsers(support, { q: run });
    expect(first.users.length).toBe(users.length);
    expect(first.nextCursor).toBeNull();
  });

  it("zeigt die Identitätsprüfung nur prüfenden Rollen und protokolliert den Zugriff", async () => {
    const asSupport = await getUserDetail(support, member);
    expect(asSupport?.identityCheck).toBeNull();
    expect(asSupport?.reportCount).toBe(1);
    expect(asSupport?.securityEvents).toEqual([{ type: "PASSWORD_CHANGED", createdAt: expect.any(Date) }]);
    const asModerator = await getUserDetail(moderator, member);
    expect(asModerator?.identityCheck?.latest?.status).toBe("APPROVED");
    const audit = await db.auditEvent.count({ where: { action: "user.viewed", target: `user:${member}`, actorId: { in: [support, moderator] } } });
    expect(audit).toBe(2);
    const history = await getUserDetail(support, suspended);
    expect(history?.restrictionHistory.map((entry) => [entry.kind, entry.active])).toEqual(
      expect.arrayContaining([
        ["SUSPENDED", true],
        ["MESSAGING", false],
      ]),
    );
    expect(await getUserDetail(support, `it_admf_fehlt_${run}`)).toBeNull();
  });
});

describe("Interne Rollen", () => {
  it("ersetzt Rollen und protokolliert vorher und nachher", async () => {
    expect(await setInternalRoles(superA, member, ["SUPPORT", "CONTENT_EDITOR", "SUPPORT"], "Neue Supportperson im Team")).toEqual({ ok: true });
    const roles = await db.internalRoleAssignment.findMany({ where: { userId: member }, select: { role: true, grantedBy: true } });
    expect(roles.map((row) => row.role).sort()).toEqual(["CONTENT_EDITOR", "SUPPORT"]);
    expect(roles.every((row) => row.grantedBy === superA)).toBe(true);
    const audit = await db.auditEvent.findFirst({ where: { actorId: superA, action: "user.roles_changed", target: `user:${member}` } });
    expect(audit?.reason).toBe("Neue Supportperson im Team (vorher: keine; nachher: CONTENT_EDITOR,SUPPORT)");
    expect(await setInternalRoles(superA, member, [], "Wechsel aus dem Team")).toEqual({ ok: true });
    expect(await db.internalRoleAssignment.count({ where: { userId: member } })).toBe(0);
    const staff = await listInternalStaff(superA);
    expect(staff.find((entry) => entry.id === support)?.roles.map((row) => row.role)).toEqual(["SUPPORT"]);
  });

  it("verlangt eine Begründung und lehnt Plattform-Admins ab", async () => {
    expect(await setInternalRoles(superA, member, ["SUPPORT"], "kurz")).toEqual({ ok: false, reason: "invalid" });
    await expect(setInternalRoles(platform, member, ["SUPPORT"], "Begründung lang genug")).rejects.toBeInstanceOf(AdminForbiddenError);
  });

  it("niemand nimmt sich selbst SUPER_ADMIN", async () => {
    expect(await setInternalRoles(superA, superA, ["PLATFORM_ADMIN"], "Ich will mich selbst zurückstufen")).toEqual({ ok: false, reason: "self-super-admin" });
    expect(await db.internalRoleAssignment.count({ where: { userId: superA, role: "SUPER_ADMIN" } })).toBe(1);
  });

  it("zwei Super Admins entfernen sich nicht gleichzeitig gegenseitig", async () => {
    const results = await Promise.allSettled([
      setInternalRoles(superA, superB, [], "Gegenseitiges Entfernen A"),
      setInternalRoles(superB, superA, [], "Gegenseitiges Entfernen B"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled" && result.value.ok)).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected && rejected.status === "rejected" ? rejected.reason : null).toBeInstanceOf(AdminForbiddenError);
    expect(await db.internalRoleAssignment.count({ where: { userId: { in: [superA, superB] }, role: "SUPER_ADMIN" } })).toBe(1);
  });
});

describe("Übersicht und System", () => {
  it("liefert Zahlen ohne Abrechnung und Fehlerspeicher", async () => {
    const overview = await getPlatformOverview(support);
    expect(overview.registrations.last7Days).toBeGreaterThanOrEqual(users.length);
    expect(overview.moderation.openCases).toBeGreaterThanOrEqual(1);
    expect(overview.billing).toBeNull();
    expect(overview.technicalErrors).toBeNull();
    expect(Object.keys(overview.securityWarnings.byType).sort()).toEqual(["PASSKEY_REMOVED", "PASSWORD_RESET", "TWO_FACTOR_DISABLED"]);
  });

  it("setzt Feature Flags nur mit bekannten Schlüsseln und Regionen", async () => {
    expect(await setFeatureFlag(platform, "unbekannt", { enabled: true, disabledRegions: [] }, "Begründung lang genug")).toEqual({ ok: false, reason: "unknown-key" });
    expect(await setFeatureFlag(platform, "community", { enabled: true, disabledRegions: [`it-fehlt-${run}`] }, "Begründung lang genug")).toEqual({ ok: false, reason: "unknown-region" });
    const region = await db.region.findFirstOrThrow({ select: { slug: true } });
    expect(await setFeatureFlag(platform, "community", { enabled: true, disabledRegions: [region.slug] }, "Test der Abschaltung pro Region")).toEqual({ ok: true });
    const flags = await listFeatureFlags(platform);
    expect(flags.find((flag) => flag.key === "community")).toMatchObject({ enabled: true, disabledRegions: [region.slug] });
    expect(flags.map((flag) => flag.key)).toEqual(["community", "business-suite"]);
    expect(await db.auditEvent.count({ where: { actorId: platform, action: "flag.changed", target: "flag:community" } })).toBe(1);
  });

  it("blättert im Audit-Log nach Präfix, ohne selbst Einträge zu schreiben", async () => {
    const before = await db.auditEvent.count({ where: { actorId: platform } });
    const page = await listAuditEvents(platform, { action: "user.", target: `user:${member}` });
    expect(page.events.length).toBeGreaterThanOrEqual(4);
    expect(page.events.every((event) => event.action.startsWith("user.") && event.target === `user:${member}`)).toBe(true);
    const dates = page.events.map((event) => event.createdAt.getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    const byActor = await listAuditEvents(platform, { actorId: superA, action: "user.roles_changed" });
    expect(byActor.events[0]?.actorUsername).toBeNull();
    expect(await db.auditEvent.count({ where: { actorId: platform } })).toBe(before);
  });

  it("prüft Postgres, Redis, Queues und Migrationen", async () => {
    const status = await getServiceStatus(platform);
    expect(status.postgres.ok).toBe(true);
    expect(status.migrations.ok).toBe(true);
    expect(status.migrations.applied).toBeGreaterThan(0);
    expect(status.migrations.last).toMatch(/^\d{14}_/);
    expect(status.redis.ok).toBe(process.env.REDIS_URL ? true : false);
    expect(status.queues.map((queue) => queue.name)).toContain("email");
    if (status.redis.ok) expect(status.queues.every((queue) => queue.ok && queue.counts)).toBe(true);
  });
});

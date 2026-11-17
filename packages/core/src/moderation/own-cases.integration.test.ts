import { getDb, type InternalRole } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => {
    const pipeline = { set: () => pipeline, del: () => pipeline, exec: async () => [] };
    return { publish: async () => 0, multi: () => pipeline };
  },
}));

const moderation = await import("./index");

/**
 * Einspruch aus dem Studio (Schritt 1.13): `appealableCaseFor` findet den
 * entschiedenen Fall zu einem eigenen Medium, nie zu einem fremden und nie
 * nach «Kein Verstoss». Konten und Medien sind fiktiv und werden gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const reason = "Fiktive Begründung für den Test, ausreichend lang.";

async function user(label: string, roles: InternalRole[] = []) {
  const id = `it_own_${label}_${run}`;
  users.push(id);
  await db.user.create({ data: { id, name: `Fiktiv ${label}`, email: `${id}@fiktiv.test`, emailVerified: true, ageConfirmedAt: new Date(), twoFactorEnabled: true } });
  for (const role of roles) await db.internalRoleAssignment.create({ data: { userId: id, role, grantedBy: "test" } });
  return id;
}

async function media(ownerId: string) {
  const profile = await db.providerProfile.findUnique({ where: { userId: ownerId }, select: { id: true } });
  const profileId =
    profile?.id ?? (await db.providerProfile.create({ data: { userId: ownerId, slug: `fiktiv-own-${ownerId}`.slice(0, 60), displayName: "Fiktiv Inhaber", status: "PUBLISHED" } })).id;
  return db.mediaAsset.create({ data: { ownerUserId: ownerId, providerProfileId: profileId, status: "PUBLISHED", originalKey: `it-own-${randomKey()}`, rightsConfirmedAt: new Date() } });
}

let counter = 0;
const randomKey = () => `${run}-${(counter += 1)}`;

let owner = "";
let stranger = "";
let reporter = "";
let moderator = "";

beforeAll(async () => {
  owner = await user("inhaber");
  stranger = await user("fremd");
  reporter = await user("melder");
  moderator = await user("moderation", ["MODERATOR"]);
});

afterAll(async () => {
  const reports = await db.report.findMany({ where: { reporterId: { in: users } }, select: { id: true } });
  await db.auditEvent.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: reports.map((report) => `report:${report.id}`) } }] } });
  await db.report.deleteMany({ where: { id: { in: reports.map((report) => report.id) } } });
  await db.mediaAsset.deleteMany({ where: { ownerUserId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("appealableCaseFor", () => {
  it("findet den Fall zum eigenen gesperrten Medium; einmal Einspruch, danach nicht mehr", async () => {
    const asset = await media(owner);
    expect(await moderation.appealableCaseFor(owner, "MEDIA", asset.id)).toBeNull();
    const filed = await moderation.fileReport({ reporterId: reporter, targetType: "MEDIA", targetId: asset.id, reason: "impersonation", details: null });
    expect(await moderation.appealableCaseFor(owner, "MEDIA", asset.id)).toBeNull();
    expect(await moderation.decideCase(moderator, filed.reportId, { decision: "CONTENT_REMOVED", rule: "R-MOD-3", reason })).toEqual({ ok: true });

    const found = await moderation.appealableCaseFor(owner, "MEDIA", asset.id);
    expect(found).toMatchObject({ reportId: filed.reportId, decision: "CONTENT_REMOVED", rule: "R-MOD-3", decisionReason: reason, appealStatus: "NONE", canAppeal: true });
    expect(found).not.toHaveProperty("reporterId");
    expect(await moderation.appealableCaseFor(stranger, "MEDIA", asset.id)).toBeNull();

    expect(await moderation.appealCase(owner, filed.reportId, "Fiktiver Einspruch des Inhabers, lang genug.")).toEqual({ ok: true });
    expect(await moderation.appealableCaseFor(owner, "MEDIA", asset.id)).toMatchObject({ appealStatus: "OPEN", canAppeal: false });
  });

  it("nach «Kein Verstoss» gibt es nichts anzufechten", async () => {
    const asset = await media(owner);
    const filed = await moderation.fileReport({ reporterId: reporter, targetType: "MEDIA", targetId: asset.id, reason: "spam", details: null });
    expect(await moderation.decideCase(moderator, filed.reportId, { decision: "NO_ACTION", rule: "R-MOD-0", reason })).toEqual({ ok: true });
    expect(await moderation.appealableCaseFor(owner, "MEDIA", asset.id)).toBeNull();
  });

  it("ungültige Kennungen ergeben null ohne Abfrage", async () => {
    expect(await moderation.appealableCaseFor("", "MEDIA", "x")).toBeNull();
    expect(await moderation.appealableCaseFor(owner, "MEDIA", "x".repeat(65))).toBeNull();
  });
});

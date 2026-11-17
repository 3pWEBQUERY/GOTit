import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { listCategoriesForAdmin, setCategoryApproved, upsertCategory } from "../catalog/admin";
import { listRegionsForAdmin, markRegionChecked, setRegionApproved, updateRegionRules } from "./admin";

// Kein echter Job: Die Aktualisierung des Suchindex wird nur gezählt.
const enqueue = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@app/jobs", async (importOriginal) => ({ ...(await importOriginal<object>()), enqueue }));

/** Freigabe von Regionen und Kategorien (v1 9.5) gegen Postgres, mit fiktiven Regionen. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
let admin = "";
let cantonId = "";
let cityId = "";
let profileId = "";
const categoryIds: string[] = [];

async function region(slug: string, kind: "CANTON" | "CITY", parentId: string | null = null) {
  const row = await db.region.create({ data: { slug, kind, parentId, nameDe: `Fiktiv ${slug}`, nameFr: "f", nameIt: "i", nameEn: "e" }, select: { id: true } });
  return row.id;
}

beforeAll(async () => {
  admin = `it_geo_admin_${run}`;
  const owner = `it_geo_owner_${run}`;
  users.push(admin, owner);
  await db.user.create({ data: { id: admin, name: "Fiktiv", email: `${admin}@fiktiv.test`, twoFactorEnabled: true } });
  await db.user.create({ data: { id: owner, name: "Fiktiv", email: `${owner}@fiktiv.test` } });
  await db.internalRoleAssignment.create({ data: { userId: admin, role: "PLATFORM_ADMIN", grantedBy: "test" } });
  cantonId = await region(`it-kanton-${run}`, "CANTON");
  cityId = await region(`it-stadt-${run}`, "CITY", cantonId);
  const profile = await db.providerProfile.create({ data: { userId: owner, slug: `it-geo-${run}`, displayName: "Fiktiv" }, select: { id: true } });
  profileId = profile.id;
  await db.providerRegion.create({ data: { providerProfileId: profileId, regionId: cityId } });
});

afterAll(async () => {
  await db.providerProfile.deleteMany({ where: { id: profileId } });
  await db.region.deleteMany({ where: { id: cityId } });
  await db.region.deleteMany({ where: { id: cantonId } });
  await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Regionen freigeben", () => {
  it("verlangt die dokumentierte Prüfung und den freigegebenen Kanton", async () => {
    expect(await setRegionApproved(admin, cantonId, true, "Freigabe für den Start")).toEqual({ ok: false, reason: "not-checked" });
    expect(await markRegionChecked(admin, cityId, "Bewilligungspflicht geprüft, Stand 2026")).toEqual({ ok: true });
    expect(await setRegionApproved(admin, cityId, true, "Freigabe für den Start")).toEqual({ ok: false, reason: "parent-not-approved" });
    expect(await markRegionChecked(admin, cantonId, "Kantonales Recht geprüft, Stand 2026")).toEqual({ ok: true });
    expect(await setRegionApproved(admin, cantonId, true, "Freigabe für den Start")).toEqual({ ok: true });
    enqueue.mockClear();
    expect(await setRegionApproved(admin, cityId, true, "Freigabe für den Start")).toEqual({ ok: true });
    expect(enqueue).toHaveBeenCalledTimes(1);
    const checked = await db.region.findUniqueOrThrow({ where: { id: cityId } });
    expect(checked.legalCheckedById).toBe(admin);
    expect(checked.approved).toBe(true);
    const actions = await db.auditEvent.findMany({ where: { actorId: admin, target: `region:it-stadt-${run}` }, select: { action: true } });
    expect(actions.map((row) => row.action).sort()).toEqual(["region.approved", "region.legal_checked"]);
  });

  it("zeigt den Baum mit Regeln und Zahl der Profile", async () => {
    expect(await updateRegionRules(admin, cantonId, { legalNote: "Bewilligung nötig", requiredPermits: "Kantonale Bewilligung", contentRestrictions: null, featuredRank: null })).toEqual({ ok: true });
    const tree = await listRegionsForAdmin(admin);
    const canton = tree.find((entry) => entry.id === cantonId);
    expect(canton?.legalNote).toBe("Bewilligung nötig");
    expect(canton?.children.map((child) => [child.id, child.providerCount, child.legalCheckedByUsername])).toEqual([[cityId, 1, null]]);
    const audit = await db.auditEvent.findFirst({ where: { actorId: admin, action: "region.rules_changed" } });
    expect(audit?.reason).toBe("Felder: legalNote, requiredPermits");
  });

  it("zieht mit dem Kanton auch die Städte zurück", async () => {
    expect(await setRegionApproved(admin, cantonId, false, "Rechtslage hat sich geändert")).toEqual({ ok: true });
    const city = await db.region.findUniqueOrThrow({ where: { id: cityId } });
    expect(city.approved).toBe(false);
    expect(await db.auditEvent.count({ where: { actorId: admin, action: "region.unapproved" } })).toBe(2);
  });
});

describe("Kategorien", () => {
  it("legt an, verlangt eindeutige Slugs und gibt frei", async () => {
    const input = { slug: `it-kat-${run}`.slice(0, 40), nameDe: "Fiktiv", nameFr: "Fictif", nameIt: "Fittizio", nameEn: "Fictional", sortOrder: 5 };
    const created = await upsertCategory(admin, input);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    categoryIds.push(created.id);
    expect(await upsertCategory(admin, input)).toEqual({ ok: false, reason: "slug-taken" });
    expect(await upsertCategory(admin, { ...input, slug: "Gross" })).toEqual({ ok: false, reason: "invalid" });
    expect(await upsertCategory(admin, { ...input, id: created.id, nameDe: "Fiktiv neu" })).toEqual({ ok: true, id: created.id });
    expect(await setCategoryApproved(admin, created.id, true, "Kategorie für den Start")).toEqual({ ok: true, id: created.id });
    const listed = (await listCategoriesForAdmin(admin)).find((row) => row.id === created.id);
    expect(listed).toMatchObject({ approved: true, nameDe: "Fiktiv neu", providerCount: 0 });
    const actions = await db.auditEvent.findMany({ where: { actorId: admin, target: `category:${input.slug}` }, select: { action: true } });
    expect(actions.map((row) => row.action).sort()).toEqual(["category.approved", "category.created", "category.updated"]);
  });
});

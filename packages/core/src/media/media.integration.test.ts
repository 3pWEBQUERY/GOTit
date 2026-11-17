import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb } from "@app/db";
import type * as Jobs from "@app/jobs";
import { getStorage, resetStorage } from "@app/storage";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const queued = vi.hoisted(() => [] as { queue: string; payload: unknown }[]);
vi.mock("@app/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof Jobs>();
  return { ...actual, enqueue: async (definition: { queue: string }, payload: unknown) => void queued.push({ queue: definition.queue, payload }) };
});

const media = await import("./index");

/** Läuft gegen Postgres mit dem Treiber fs in einem eigenen Verzeichnis. Konten sind fiktiv und werden danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const ids: string[] = [];
let root = "";

async function provider(label: string, status: "DRAFT" | "PUBLISHED" | "SUSPENDED" = "PUBLISHED") {
  const id = `it_media_${label}_${run}`;
  ids.push(id);
  await db.user.create({ data: { id, name: `Fiktiv ${label}`, email: `${id}@fiktiv.test`, emailVerified: true, accountType: "PROVIDER", ageConfirmedAt: new Date() } });
  const profile = await db.providerProfile.create({ data: { userId: id, slug: `fiktiv-media-${label}-${run}`, displayName: `Fiktiv ${label}`, status } });
  return { userId: id, profileId: profile.id };
}

const valid = { contentType: "image/jpeg", sizeBytes: 3, rightsConfirmed: true as const, visibility: "PUBLIC" as "PUBLIC" | "MEMBERS" };

async function uploaded(userId: string, input: Partial<typeof valid> = {}) {
  const result = await media.requestUpload(userId, { ...valid, ...input });
  if (!result.ok) throw new Error(result.reason);
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: result.mediaId } });
  await getStorage().putObject({ bucket: "originals", key: asset.originalKey, body: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
  return result.mediaId;
}

/** Simuliert den Worker: Varianten anlegen und auf IN_REVIEW setzen. */
async function processed(mediaId: string) {
  await db.mediaAsset.update({ where: { id: mediaId }, data: { status: "PROCESSING" } });
  const variants = media.MEDIA_WIDTHS.flatMap((width) =>
    media.MEDIA_FORMATS.map((format) => ({ name: media.variantName(width, format), width, height: width, format, key: `m/${mediaId}/t/${media.variantName(width, format)}`, bytes: 3 })),
  );
  expect((await media.completeProcessing(mediaId, { mimeType: "image/jpeg", sizeBytes: 3, width: 1440, height: 1440, dominantColor: "#112233", variants })).ok).toBe(true);
}

const reviewer = `it_media_pruefer_${run}`;
const support = `it_media_support_${run}`;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "media-it-"));
  process.env.STORAGE_DRIVER = "fs";
  process.env.STORAGE_FS_ROOT = root;
  process.env.APP_ENV = "test";
  process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
  resetStorage();
  for (const [id, role] of [[reviewer, "MODERATOR"], [support, "SUPPORT"]] as const) {
    ids.push(id);
    await db.user.create({ data: { id, name: `Fiktiv ${role}`, email: `${id}@fiktiv.test`, emailVerified: true, twoFactorEnabled: true } });
    await db.internalRoleAssignment.create({ data: { userId: id, role } });
  }
});
beforeEach(() => void queued.splice(0));
afterAll(async () => {
  const assets = await db.mediaAsset.findMany({ where: { ownerUserId: { in: ids } }, select: { id: true } });
  await db.auditEvent.deleteMany({ where: { OR: [{ target: { in: assets.map((asset) => `media:${asset.id}`) } }, { actorId: { in: ids } }] } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await rm(root, { recursive: true, force: true });
});

describe("Upload (PRD v2 14.3)", () => {
  it("prüft Rechte, Typ, Grösse und Profil, bevor eine URL entsteht", async () => {
    const { userId } = await provider("regeln");
    expect(await media.requestUpload(userId, { ...valid, rightsConfirmed: false })).toEqual({ ok: false, reason: "rights" });
    expect(await media.requestUpload(userId, { ...valid, rightsConfirmed: undefined })).toEqual({ ok: false, reason: "rights" });
    expect(await media.requestUpload(userId, { ...valid, contentType: "image/gif" })).toEqual({ ok: false, reason: "type" });
    expect(await media.requestUpload(userId, { ...valid, sizeBytes: media.MEDIA_MAX_BYTES + 1 })).toEqual({ ok: false, reason: "size" });
    expect(await media.requestUpload(support, valid)).toEqual({ ok: false, reason: "no-profile" });
    expect(await db.mediaAsset.count({ where: { ownerUserId: userId } })).toBe(0);
    const suspended = await provider("gesperrt", "SUSPENDED");
    expect(await media.requestUpload(suspended.userId, valid)).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("legt UPLOADING mit nicht erratbarem Schlüssel an, bestätigt nur mit Objekt und legt den Job an", async () => {
    const { userId } = await provider("weg", "DRAFT");
    const result = await media.requestUpload(userId, valid);
    if (!result.ok) throw new Error(result.reason);
    expect(result.upload.url).toMatch(/^\/api\/storage\/upload\//);
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: result.mediaId } });
    expect(asset.status).toBe("UPLOADING");
    expect(asset.originalKey).toMatch(/^o\/[\w-]{32}$/);
    expect(asset.originalKey).not.toContain(userId);
    expect(asset.rightsConfirmedAt).toBeInstanceOf(Date);
    expect(await media.confirmUpload(userId, result.mediaId)).toEqual({ ok: false, reason: "missing" });
    await getStorage().putObject({ bucket: "originals", key: asset.originalKey, body: new Uint8Array([1]), contentType: "image/jpeg" });
    const other = await provider("fremd");
    expect(await media.confirmUpload(other.userId, result.mediaId)).toEqual({ ok: false, reason: "not-found" });
    expect(await media.confirmUpload(userId, result.mediaId)).toEqual({ ok: true });
    expect(await media.confirmUpload(userId, result.mediaId)).toEqual({ ok: false, reason: "not-found" });
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: result.mediaId } })).status).toBe("PROCESSING");
    expect(queued).toEqual([{ queue: "media-process", payload: { mediaId: result.mediaId } }]);
  });

  it("begrenzt auf 60 Medien pro Profil", async () => {
    const { userId, profileId } = await provider("kontingent");
    await db.mediaAsset.createMany({
      data: Array.from({ length: media.MEDIA_QUOTA }, (_, index) => ({ ownerUserId: userId, providerProfileId: profileId, status: "IN_REVIEW" as const, originalKey: `o/quota-${run}-${index}`, rightsConfirmedAt: new Date() })),
    });
    expect(await media.requestUpload(userId, valid)).toEqual({ ok: false, reason: "quota" });
    await db.mediaAsset.updateMany({ where: { originalKey: `o/quota-${run}-0` }, data: { deletedAt: new Date() } });
    expect((await media.requestUpload(userId, valid)).ok).toBe(true);
  });
});

describe("Bibliothek", () => {
  it("Reihenfolge, Nach vorne und Nach hinten, genau ein Titelbild, Sichtbarkeit und Alternativtext", async () => {
    const { userId } = await provider("bibliothek");
    const [a, b, c] = [await uploaded(userId), await uploaded(userId), await uploaded(userId)] as [string, string, string];
    for (const id of [a, b, c]) await processed(id);
    const order = async () => (await media.listOwnMedia(userId))?.media.map((entry) => entry.id);
    expect(await order()).toEqual([a, b, c]);
    expect((await media.listOwnMedia(userId))?.media.filter((entry) => entry.isCover).map((entry) => entry.id)).toEqual([a]);

    expect(await media.moveOwnMedia(userId, c, { direction: "forward" })).toEqual({ ok: true });
    expect(await order()).toEqual([a, c, b]);
    expect(await media.moveOwnMedia(userId, a, { direction: "forward" })).toEqual({ ok: false, reason: "edge" });
    expect(await media.reorderOwnMedia(userId, { order: [b, a, c] })).toEqual({ ok: true });
    expect(await order()).toEqual([b, a, c]);
    expect(await media.reorderOwnMedia(userId, { order: [b, a] })).toEqual({ ok: false, reason: "invalid" });

    expect(await media.setCoverMedia(userId, c)).toEqual({ ok: true });
    expect(await db.mediaAsset.count({ where: { ownerUserId: userId, isCover: true } })).toBe(1);
    expect(await media.setOwnMediaVisibility(userId, [a, b], { visibility: "MEMBERS" })).toEqual({ updated: 2 });
    expect(await media.setOwnMediaAltText(userId, a, { altText: "  Fiktives Porträt im Gegenlicht " })).toEqual({ ok: true });
    expect((await media.getOwnMedia(userId, a))?.altText).toBe("Fiktives Porträt im Gegenlicht");
  });

  it("fremde IDs verhalten sich wie unbekannte", async () => {
    const owner = await provider("eigentum");
    const stranger = await provider("stranger");
    const id = await uploaded(owner.userId);
    await processed(id);
    expect(await media.getOwnMedia(stranger.userId, id)).toBeNull();
    expect(await media.moveOwnMedia(stranger.userId, id, { direction: "backward" })).toEqual({ ok: false, reason: "not-found" });
    expect(await media.setCoverMedia(stranger.userId, id)).toEqual({ ok: false, reason: "not-found" });
    expect(await media.setOwnMediaAltText(stranger.userId, id, { altText: "x" })).toEqual({ ok: false, reason: "not-found" });
    expect(await media.setOwnMediaVisibility(stranger.userId, id, { visibility: "MEMBERS" })).toEqual({ updated: 0 });
    expect(await media.deleteOwnMedia(stranger.userId, id)).toEqual({ deleted: 0 });
    expect(await media.resolveMediaDelivery(id, "w320.webp", stranger.userId)).toBeNull();
    expect(queued).toEqual([]);
  });

  it("Löschen setzt deletedAt, gibt das Titelbild weiter und legt einen Job mit allen Schlüsseln an", async () => {
    const { userId } = await provider("loeschen");
    const [a, b] = [await uploaded(userId), await uploaded(userId)] as [string, string];
    await processed(a);
    await processed(b);
    expect(await media.deleteOwnMedia(userId, a)).toEqual({ deleted: 1 });
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: a } })).deletedAt).toBeInstanceOf(Date);
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: b } })).isCover).toBe(true);
    expect(queued).toHaveLength(1);
    const job = queued[0]?.payload as { mediaId: string; originals: string[]; derivatives: string[] };
    expect(job.mediaId).toBe(a);
    expect(job.originals).toHaveLength(1);
    expect(job.derivatives).toHaveLength(8);
    expect(await media.getOwnMedia(userId, a)).toBeNull();
    expect(await media.resolveMediaDelivery(a, "w320.webp", userId)).toBeNull();
    expect(await media.deleteOwnMedia(userId, a)).toEqual({ deleted: 0 });
  });
});

describe("Moderation und Auslieferung", () => {
  it("nur Prüfrollen entscheiden, atomar nur aus IN_REVIEW, mit Audit-Event", async () => {
    const { userId, profileId } = await provider("moderation");
    const id = await uploaded(userId);
    await processed(id);
    await expect(media.listMediaQueue(support)).rejects.toThrow(/forbidden/);
    await expect(media.decideMedia(support, id, { decision: "PUBLISHED", reason: "Bild entspricht den Regeln" })).rejects.toThrow(/forbidden/);
    expect((await media.listMediaQueue(reviewer)).map((entry) => entry.id)).toContain(id);
    await expect(media.decideMedia(reviewer, id, { decision: "PUBLISHED", reason: "kurz" })).rejects.toThrow();
    expect(await media.decideMedia(reviewer, id, { decision: "PUBLISHED", reason: "Bild entspricht den Regeln", rule: "M-1" })).toEqual({ ok: true });
    expect(await media.decideMedia(reviewer, id, { decision: "BLOCKED", reason: "Zweiter Entscheid zum selben Medium" })).toEqual({ ok: false, reason: "not-open" });
    expect(await db.auditEvent.count({ where: { target: `media:${id}`, action: "media.published" } })).toBe(1);
    expect(await media.listProfileMedia(profileId, { viewerIsMember: false })).toEqual([
      expect.objectContaining({ id, locked: false, width: 1440, height: 1440, dominantColor: "#112233", isCover: true }),
    ]);
  });

  it("öffentlich mit Cache, Mitglieder nur angemeldet, Eigentümer in jedem Status ausser FAILED, sonst null", async () => {
    const { userId, profileId } = await provider("auslieferung");
    const other = await provider("betrachter");
    const pub = await uploaded(userId);
    const members = await uploaded(userId, { visibility: "MEMBERS" });
    await processed(pub);
    await processed(members);
    expect(await media.resolveMediaDelivery(pub, "w640.avif", null)).toBeNull();
    expect(await media.resolveMediaDelivery(pub, "w640.avif", userId)).toMatchObject({ access: "private", format: "avif" });
    expect(await media.resolveReviewPreview(pub, "w640.avif", support)).toBeNull();
    expect(await media.resolveReviewPreview(pub, "w640.avif", reviewer)).toMatchObject({ access: "private" });
    for (const id of [pub, members]) await media.decideMedia(reviewer, id, { decision: "PUBLISHED", reason: "Bild entspricht den Regeln" });
    expect(await media.resolveReviewPreview(pub, "w640.avif", reviewer)).toBeNull();
    expect(await media.resolveMediaDelivery(pub, "w640.avif", null)).toMatchObject({ access: "public" });
    expect(await media.resolveMediaDelivery(pub, "w641.avif", null)).toBeNull();
    expect(await media.resolveMediaDelivery(pub, "../original", null)).toBeNull();
    expect(await media.resolveMediaDelivery(members, "w320.webp", null)).toBeNull();
    expect(await media.resolveMediaDelivery(members, "w320.webp", other.userId)).toMatchObject({ access: "private" });
    expect(await media.resolveMediaDelivery("gibt-es-nicht", "w320.webp", null)).toBeNull();
    expect((await media.listProfileMedia(profileId, { viewerIsMember: false })).map((entry) => [entry.id, entry.locked])).toEqual([
      [pub, false],
      [members, true],
    ]);
    expect((await media.listProfileMedia(profileId, { viewerIsMember: true })).every((entry) => !entry.locked)).toBe(true);
    const failed = await uploaded(userId);
    await db.providerProfile.update({ where: { id: profileId }, data: { status: "SUSPENDED" } });
    expect(await media.resolveMediaDelivery(pub, "w640.avif", null)).toBeNull();
    await db.mediaAsset.update({ where: { id: failed }, data: { status: "PROCESSING" } });
    await media.failProcessing(failed, "unsupported-type");
    expect(await media.resolveMediaDelivery(failed, "w320.webp", userId)).toBeNull();
    expect((await media.getOwnMedia(userId, failed))?.failureReason).toBe("unsupported-type");
  });
});

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb } from "@app/db";
import { createFsStorage, type ObjectStorage } from "@app/storage";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDeleteMediaJob } from "./delete-media";
import { createProcessMediaJob } from "./process-media";

/** Läuft gegen Postgres mit dem Treiber fs in einem eigenen Verzeichnis; Konto und Profil sind fiktiv. */
const db = getDb();
const userId = `it_worker_${Date.now()}`;
let root = "";
let storage: ObjectStorage;
let profileId = "";

async function asset(body: Uint8Array): Promise<{ id: string; originalKey: string }> {
  const originalKey = `o/worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await storage.putObject({ bucket: "originals", key: originalKey, body, contentType: "image/jpeg" });
  return db.mediaAsset.create({ data: { ownerUserId: userId, providerProfileId: profileId, status: "PROCESSING", originalKey, rightsConfirmedAt: new Date() }, select: { id: true, originalKey: true } });
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "worker-media-"));
  storage = createFsStorage({ driver: "fs", root, secret: "x".repeat(32) });
  await db.user.create({ data: { id: userId, name: "Fiktiv Worker", email: `${userId}@fiktiv.test`, accountType: "PROVIDER" } });
  profileId = (await db.providerProfile.create({ data: { userId, slug: `fiktiv-${userId}`, displayName: "Fiktiv Worker" } })).id;
});
afterAll(async () => {
  const assets = await db.mediaAsset.findMany({ where: { ownerUserId: userId }, select: { id: true } });
  await db.auditEvent.deleteMany({ where: { target: { in: assets.map((entry) => `media:${entry.id}`) } } });
  await db.user.deleteMany({ where: { id: userId } });
  await rm(root, { recursive: true, force: true });
});

describe("Jobs media-process und media-delete", () => {
  it("erzeugt Varianten ohne GPS, ersetzt das Original, setzt IN_REVIEW und löscht danach alles", async () => {
    const jpeg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#7a6a5c" } })
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "47/1 22/1 0/1", GPSMapDatum: "FIKTIV-GPS" } })
      .jpeg()
      .toBuffer();
    const { id, originalKey } = await asset(new Uint8Array(jpeg));
    await createProcessMediaJob(() => storage)({ mediaId: id });
    const done = await db.mediaAsset.findUniqueOrThrow({ where: { id }, include: { variants: true } });
    expect(done).toMatchObject({ status: "IN_REVIEW", width: 1200, height: 800, mimeType: "image/jpeg", isCover: true });
    expect(done.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(done.variants.map((variant) => variant.name).sort()).toEqual(["w1440.avif", "w1440.webp", "w320.avif", "w320.webp", "w640.avif", "w640.webp", "w960.avif", "w960.webp"]);
    const objects = [...done.variants.map((variant) => ({ bucket: "derivatives" as const, key: variant.key })), { bucket: "originals" as const, key: originalKey }];
    for (const ref of objects) {
      const body = await storage.getObject(ref);
      expect(body).not.toBeNull();
      expect(Buffer.from(body ?? []).includes(Buffer.from("FIKTIV-GPS"))).toBe(false);
      expect((await sharp(body ?? undefined).metadata()).exif).toBeUndefined();
    }

    await createDeleteMediaJob(() => storage)({ mediaId: id, originals: [originalKey], derivatives: done.variants.map((variant) => variant.key) });
    for (const ref of objects) expect(await storage.getObject(ref)).toBeNull();
    expect(await db.mediaVariant.count({ where: { mediaId: id } })).toBe(0);
    expect(await db.auditEvent.count({ where: { target: `media:${id}`, action: "media.purged" } })).toBe(1);
  });

  it("Text als .jpg: FAILED mit Grund, Original gelöscht", async () => {
    const { id, originalKey } = await asset(new TextEncoder().encode("Fiktiver Text, kein Bild"));
    await createProcessMediaJob(() => storage)({ mediaId: id });
    expect(await db.mediaAsset.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "FAILED", failureReason: "unsupported-type", isCover: false });
    expect(await storage.getObject({ bucket: "originals", key: originalKey })).toBeNull();
  });

  it("ein gelöschtes oder bereits verarbeitetes Medium bleibt unberührt", async () => {
    const { id } = await asset(new Uint8Array([1, 2, 3]));
    await db.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });
    await createProcessMediaJob(() => storage)({ mediaId: id });
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id } })).status).toBe("PROCESSING");
  });
});

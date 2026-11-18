import { getDb } from "@app/db";
import { getStorage } from "@app/storage";
import { afterAll, describe, expect, it } from "vitest";
import { purgeMediaObjectsOfUsers } from "./purge-storage";

/** Löschung eines Kontos entfernt auch die Dateien seiner Medien (Sicherheitsprüfung 1.14). */
const db = getDb();
const run = `${Date.now()}`;
const userId = `it_purge_media_${run}`;
const otherId = `it_purge_media_other_${run}`;

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
});

describe("purgeMediaObjectsOfUsers", () => {
  it("löscht Original und Varianten der Konten, fremde Medien bleiben", async () => {
    const storage = getStorage();
    for (const id of [userId, otherId]) await db.user.create({ data: { id, name: "Fiktiv", email: `${id}@fiktiv.test` } });
    const own = await db.mediaAsset.create({ data: { ownerUserId: userId, status: "PUBLISHED", originalKey: `originals/it-purge-${run}`, rightsConfirmedAt: new Date() } });
    await db.mediaVariant.create({ data: { mediaId: own.id, name: "w640.webp", width: 640, height: 800, format: "webp", key: `variants/it-purge-${run}-w640.webp`, bytes: 1 } });
    const other = await db.mediaAsset.create({ data: { ownerUserId: otherId, status: "PUBLISHED", originalKey: `originals/it-purge-other-${run}`, rightsConfirmedAt: new Date() } });
    const body = new Uint8Array([1, 2, 3]);
    await storage.putObject({ bucket: "originals", key: own.originalKey, body, contentType: "image/jpeg" });
    await storage.putObject({ bucket: "derivatives", key: `variants/it-purge-${run}-w640.webp`, body, contentType: "image/webp" });
    await storage.putObject({ bucket: "originals", key: other.originalKey, body, contentType: "image/jpeg" });

    expect(await purgeMediaObjectsOfUsers([userId])).toBe(1);
    expect(await storage.getObject({ bucket: "originals", key: own.originalKey })).toBeNull();
    expect(await storage.getObject({ bucket: "derivatives", key: `variants/it-purge-${run}-w640.webp` })).toBeNull();
    expect(await storage.getObject({ bucket: "originals", key: other.originalKey })).not.toBeNull();
    await storage.deleteObject({ bucket: "originals", key: other.originalKey });
    expect(await purgeMediaObjectsOfUsers([])).toBe(0);
  });
});

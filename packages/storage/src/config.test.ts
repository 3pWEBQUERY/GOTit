import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_FS_ROOT, resolveStorageConfig } from "./config";
import { createFsStorage, objectPath } from "./fs-driver";
import { createStorage } from "./index";
import { storageOrigins } from "./origins";

const s3Env = {
  STORAGE_DRIVER: "s3",
  S3_ENDPOINT: "https://storage.example.test",
  S3_REGION: "auto",
  S3_ORIGINALS_BUCKET: "originals-abc",
  S3_ORIGINALS_ACCESS_KEY_ID: "id-o",
  S3_ORIGINALS_SECRET_ACCESS_KEY: "secret-o",
  S3_DERIVATIVES_BUCKET: "derivatives-abc",
  S3_DERIVATIVES_ACCESS_KEY_ID: "id-d",
  S3_DERIVATIVES_SECRET_ACCESS_KEY: "secret-d",
};

describe("Wahl des Treibers", () => {
  it("fs ausserhalb der Produktion, mit Standardablage ausserhalb des Repos", () => {
    expect(resolveStorageConfig({ APP_ENV: "development" })).toMatchObject({ driver: "fs", root: DEFAULT_FS_ROOT });
    expect(resolveStorageConfig({ APP_ENV: "test", STORAGE_DRIVER: "fs", STORAGE_FS_ROOT: "/tmp/x" })).toMatchObject({ driver: "fs", root: "/tmp/x" });
  });

  it("fs ist in der Produktion verboten, s3 dort Pflicht", () => {
    expect(() => resolveStorageConfig({ APP_ENV: "production", STORAGE_DRIVER: "fs" })).toThrow(/Produktion/);
    expect(() => resolveStorageConfig({ APP_ENV: "production" })).toThrow(/Pflicht/);
    expect(resolveStorageConfig({ ...s3Env, APP_ENV: "production" })).toMatchObject({ driver: "s3", forcePathStyle: false });
  });

  it("s3 verlangt alle Angaben und kennt Path-Style", () => {
    expect(() => resolveStorageConfig({ ...s3Env, S3_ORIGINALS_SECRET_ACCESS_KEY: "" })).toThrow(/S3_ORIGINALS_SECRET_ACCESS_KEY/);
    expect(resolveStorageConfig({ ...s3Env, S3_FORCE_PATH_STYLE: "true" })).toMatchObject({ forcePathStyle: true });
    expect(() => resolveStorageConfig({ STORAGE_DRIVER: "ftp" })).toThrow();
  });

  it("presigned Upload bei s3 signiert Inhaltstyp und Länge", async () => {
    const upload = await createStorage(s3Env).presignUpload({ bucket: "originals", key: "o/abc", contentType: "image/png", maxBytes: 100, contentLength: 42, expiresIn: 60 });
    const url = new URL(upload.url);
    expect(url.host).toBe("originals-abc.storage.example.test");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;content-type;host");
    expect(upload.headers).toEqual({ "content-type": "image/png" });
    await expect(createStorage(s3Env).presignUpload({ bucket: "originals", key: "o/abc", contentType: "image/png", maxBytes: 100, contentLength: 101, expiresIn: 60 })).rejects.toThrow();
  });

  it("Herkünfte für die CSP folgen dem Adressstil", () => {
    expect(storageOrigins(s3Env)).toEqual(["https://originals-abc.storage.example.test", "https://derivatives-abc.storage.example.test"]);
    expect(storageOrigins({ ...s3Env, S3_FORCE_PATH_STYLE: "1" })).toEqual(["https://storage.example.test"]);
    expect(storageOrigins({ STORAGE_DRIVER: "fs" })).toEqual([]);
  });
});

describe("Treiber fs", () => {
  const roots: string[] = [];
  afterAll(async () => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

  it("legt ab, liest, kennt Grösse und Typ und löscht", async () => {
    const root = await mkdtemp(join(tmpdir(), "storage-"));
    roots.push(root);
    const storage = createFsStorage({ driver: "fs", root, secret: "x".repeat(32) });
    const ref = { bucket: "derivatives", key: "m/abc/w320.webp" } as const;
    expect(await storage.getObject(ref)).toBeNull();
    await storage.putObject({ ...ref, body: new Uint8Array([1, 2, 3]), contentType: "image/webp" });
    expect(await storage.getObject(ref)).toEqual(new Uint8Array([1, 2, 3]));
    expect(await storage.headObject(ref)).toEqual({ size: 3, contentType: "image/webp" });
    await storage.deleteObject(ref);
    expect(await storage.headObject(ref)).toBeNull();
    await storage.deleteObject(ref);
  });

  it("presigned URLs zeigen auf die Routen der Web-App", async () => {
    const storage = createFsStorage({ driver: "fs", root: "/tmp/nie", secret: "x".repeat(32) });
    expect((await storage.presignUpload({ bucket: "originals", key: "o/abc", contentType: "image/jpeg", maxBytes: 10, expiresIn: 60 })).url).toMatch(/^\/api\/storage\/upload\/[\w-]+\.[\w-]+$/);
    expect(await storage.presignDownload({ bucket: "derivatives", key: "m/a/w320.webp", expiresIn: 60 })).toMatch(/^\/api\/storage\/object\//);
  });

  it("weist Schlüssel ausserhalb des Buckets ab", () => {
    expect(() => objectPath("/tmp/r", { bucket: "originals", key: "../x" })).toThrow();
    expect(() => objectPath("/tmp/r", { bucket: "originals", key: "a/../../x" })).toThrow();
    expect(() => objectPath("/tmp/r", { bucket: "originals", key: "/etc/passwd" })).toThrow();
    expect(objectPath("/tmp/r", { bucket: "originals", key: "o/abc" })).toBe("/tmp/r/originals/o/abc");
  });
});

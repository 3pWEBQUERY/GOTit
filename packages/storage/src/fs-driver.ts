import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { StorageConfig } from "./config";
import type { ObjectRef, ObjectStorage } from "./types";
import { createStorageToken } from "./upload-token";

type FsConfig = Extract<StorageConfig, { driver: "fs" }>;

/** Routen der Web-App, die beim Treiber fs die presigned URLs ersetzen; in der Produktion antworten sie mit 404. */
export const FS_UPLOAD_PATH = "/api/storage/upload";
export const FS_DOWNLOAD_PATH = "/api/storage/object";

const KEY_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;

/** Pfad eines Objekts; Schlüssel mit `..` oder anderen Zeichen werden abgewiesen. */
export function objectPath(root: string, { bucket, key }: ObjectRef): string {
  if (!KEY_PATTERN.test(key) || key.split("/").some((part) => part === "." || part === "..")) throw new Error("Ungültiger Objektschlüssel.");
  const base = resolve(root, bucket);
  const path = resolve(base, key);
  if (!path.startsWith(base + sep)) throw new Error("Ungültiger Objektschlüssel.");
  return path;
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "ENOENT";
}

/** Treiber für Entwicklung und Tests: Dateien unter `STORAGE_FS_ROOT`, der Inhaltstyp daneben in `<datei>.type`. */
export function createFsStorage(config: FsConfig): ObjectStorage {
  return {
    driver: "fs",
    async presignUpload({ bucket, key, contentType, maxBytes, expiresIn }) {
      objectPath(config.root, { bucket, key });
      const token = createStorageToken({ purpose: "upload", bucket, key, contentType, maxBytes, expiresAt: Date.now() + expiresIn * 1000 }, config.secret);
      return { url: `${FS_UPLOAD_PATH}/${token}`, method: "PUT", headers: { "content-type": contentType } };
    },
    async presignDownload({ bucket, key, expiresIn }) {
      objectPath(config.root, { bucket, key });
      const token = createStorageToken({ purpose: "download", bucket, key, expiresAt: Date.now() + expiresIn * 1000 }, config.secret);
      return `${FS_DOWNLOAD_PATH}/${token}`;
    },
    async getObject(ref) {
      try {
        return new Uint8Array(await readFile(objectPath(config.root, ref)));
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async headObject(ref) {
      const path = objectPath(config.root, ref);
      try {
        const info = await stat(path);
        const type = await readFile(`${path}.type`, "utf8").catch(() => null);
        return { size: info.size, contentType: type };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async putObject({ body, contentType, ...ref }) {
      const path = objectPath(config.root, ref);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      await writeFile(`${path}.type`, contentType);
    },
    async deleteObject(ref) {
      const path = objectPath(config.root, ref);
      await rm(path, { force: true });
      await rm(`${path}.type`, { force: true });
    },
  };
}

/** Wurzel eines Buckets, für Tests und Aufräumen. */
export function bucketRoot(root: string, bucket: ObjectRef["bucket"]): string {
  return join(root, bucket);
}

import { resolveStorageConfig } from "./config";
import { createFsStorage } from "./fs-driver";
import { createS3Storage } from "./s3-driver";
import type { ObjectStorage } from "./types";

export { DEFAULT_FS_ROOT, resolveStorageConfig, type StorageConfig } from "./config";
export { FS_DOWNLOAD_PATH, FS_UPLOAD_PATH, createFsStorage, objectPath } from "./fs-driver";
export { storageOrigins } from "./origins";
export { createS3Storage } from "./s3-driver";
export { BUCKETS, type BucketName, type ObjectInfo, type ObjectRef, type ObjectStorage, type PresignedUpload, type PresignDownloadInput, type PresignUploadInput, type PutObjectInput } from "./types";
export { createStorageToken, verifyStorageToken, type StorageTokenClaims, type StorageTokenPurpose } from "./upload-token";

/** Erzeugt den Treiber aus einer Konfiguration. */
export function createStorage(env: Record<string, string | undefined> = process.env): ObjectStorage {
  const config = resolveStorageConfig(env);
  return config.driver === "s3" ? createS3Storage(config) : createFsStorage(config);
}

const store = globalThis as { __appStorage?: ObjectStorage };

/** Ein Treiber pro Prozess, aus `process.env`. */
export function getStorage(): ObjectStorage {
  store.__appStorage ??= createStorage();
  return store.__appStorage;
}

/** Nur für Tests: Treiber neu aus der Umgebung lesen. */
export function resetStorage(): void {
  store.__appStorage = undefined;
}

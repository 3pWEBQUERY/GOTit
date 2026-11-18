import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { BackupStoreConfig } from "./config";

/** Obergrenze eines einzelnen PUT bei S3; grössere Sicherungen bräuchten Multipart. */
const MAX_SINGLE_PUT = 5 * 1024 ** 3;

/** Ablage im Bucket `backups`. Anders als `@app/storage` mit Dateien und Streams statt Bytes im Speicher. */
export interface BackupStore {
  readonly driver: "s3" | "fs";
  /** Lädt eine Datei hoch, gestreamt von der Platte. */
  putFile(key: string, path: string, contentType: string): Promise<void>;
  putText(key: string, text: string, contentType: string): Promise<void>;
  /** Lädt ein Objekt in eine Datei herunter. */
  getFile(key: string, path: string): Promise<void>;
  /** Inhalt als Text; null, wenn das Objekt fehlt. */
  getText(key: string): Promise<string | null>;
  /** Alle Schlüssel unter einem Präfix. */
  list(prefix: string): Promise<string[]>;
  delete(keys: readonly string[]): Promise<void>;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/;

function fsPath(root: string, key: string): string {
  if (!KEY_PATTERN.test(key) || key.split("/").some((part) => part === "." || part === "..")) throw new Error("Ungültiger Objektschlüssel.");
  const base = resolve(root, "backups");
  const path = resolve(base, key);
  if (!path.startsWith(base + sep)) throw new Error("Ungültiger Objektschlüssel.");
  return path;
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const named = error as { code?: unknown; name?: unknown; $metadata?: { httpStatusCode?: number } };
  return named.code === "ENOENT" || named.name === "NoSuchKey" || named.$metadata?.httpStatusCode === 404;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
    if (isNotFound(error)) return [];
    throw error;
  });
  const nested = await Promise.all(entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : Promise.resolve([join(dir, entry.name)]))));
  return nested.flat();
}

/** Nur für Entwicklung und Tests: Dateien unter `<STORAGE_FS_ROOT>/backups/`. */
export function createFsBackupStore(root: string): BackupStore {
  const base = resolve(root, "backups");
  return {
    driver: "fs",
    async putFile(key, path) {
      const target = fsPath(root, key);
      await mkdir(dirname(target), { recursive: true });
      await pipeline(createReadStream(path), createWriteStream(target));
    },
    async putText(key, text) {
      const target = fsPath(root, key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, text);
    },
    async getFile(key, path) {
      await pipeline(createReadStream(fsPath(root, key)), createWriteStream(path));
    },
    async getText(key) {
      try {
        return await readFile(fsPath(root, key), "utf8");
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async list(prefix) {
      const files = await walk(base);
      return files
        .map((file) => relative(base, file).split(sep).join("/"))
        .filter((key) => key.startsWith(prefix))
        .sort();
    },
    async delete(keys) {
      await Promise.all(keys.map((key) => rm(fsPath(root, key), { force: true })));
    },
  };
}

/** Treiber für den Railway-Bucket `backups` mit eigenen Zugangsdaten. */
export function createS3BackupStore(config: Extract<BackupStoreConfig, { driver: "s3" }>): BackupStore {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const Bucket = config.bucket;
  return {
    driver: "s3",
    async putFile(key, path, contentType) {
      const { size } = await stat(path);
      if (size > MAX_SINGLE_PUT) throw new Error("Die Sicherung ist grösser als 5 GiB; dafür braucht es einen Multipart-Upload (Entscheid 0024).");
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: createReadStream(path), ContentLength: size, ContentType: contentType }));
    },
    async putText(key, text, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: text, ContentType: contentType }));
    },
    async getFile(key, path) {
      const result = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!result.Body) throw new Error(`Objekt «${key}» ist leer.`);
      await pipeline(result.Body as Readable, createWriteStream(path));
    },
    async getText(key) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return result.Body ? await result.Body.transformToString("utf8") : null;
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async list(prefix) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
        for (const item of page.Contents ?? []) if (item.Key) keys.push(item.Key);
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return keys.sort();
    },
    async delete(keys) {
      // Einzeln statt DeleteObjects: Nicht jeder S3-kompatible Speicher nimmt die Prüfsummen-Kopfzeilen des SDK an.
      for (const Key of keys) await client.send(new DeleteObjectCommand({ Bucket, Key }));
    },
  };
}

export function createBackupStore(config: BackupStoreConfig): BackupStore {
  return config.driver === "s3" ? createS3BackupStore(config) : createFsBackupStore(config.root);
}

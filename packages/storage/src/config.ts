import type { BucketName } from "./types";

/** Ablage des Treibers fs: ausserhalb des Repos, weil Turbopack das Repo beobachtet. */
export const DEFAULT_FS_ROOT = "/home/user/gotit-local/storage";

export interface S3BucketConfig {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export type StorageConfig =
  | {
      driver: "s3";
      endpoint: string;
      region: string;
      forcePathStyle: boolean;
      buckets: Record<BucketName, S3BucketConfig>;
    }
  | { driver: "fs"; root: string; secret: string | undefined };

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} ist nicht gesetzt.`);
  return value;
}

/**
 * Wählt den Treiber aus der Umgebung. `fs` ist nur ausserhalb der Produktion
 * erlaubt (`APP_ENV !== "production"`); ohne Angabe gilt dort `fs`, in der
 * Produktion ist `STORAGE_DRIVER=s3` Pflicht.
 */
export function resolveStorageConfig(env: Env = process.env): StorageConfig {
  const production = env.APP_ENV === "production";
  const driver = env.STORAGE_DRIVER?.trim() || (production ? "" : "fs");
  if (driver === "s3") {
    return {
      driver,
      endpoint: required(env, "S3_ENDPOINT"),
      region: env.S3_REGION?.trim() || "auto",
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "1" || env.S3_FORCE_PATH_STYLE === "true",
      buckets: {
        originals: {
          name: required(env, "S3_ORIGINALS_BUCKET"),
          accessKeyId: required(env, "S3_ORIGINALS_ACCESS_KEY_ID"),
          secretAccessKey: required(env, "S3_ORIGINALS_SECRET_ACCESS_KEY"),
        },
        derivatives: {
          name: required(env, "S3_DERIVATIVES_BUCKET"),
          accessKeyId: required(env, "S3_DERIVATIVES_ACCESS_KEY_ID"),
          secretAccessKey: required(env, "S3_DERIVATIVES_SECRET_ACCESS_KEY"),
        },
      },
    };
  }
  if (driver === "fs") {
    if (production) throw new Error("STORAGE_DRIVER=fs ist in der Produktion nicht erlaubt.");
    return { driver, root: env.STORAGE_FS_ROOT?.trim() || DEFAULT_FS_ROOT, secret: env.BETTER_AUTH_SECRET };
  }
  throw new Error(production ? "STORAGE_DRIVER=s3 ist in der Produktion Pflicht." : `Unbekannter STORAGE_DRIVER «${driver}».`);
}

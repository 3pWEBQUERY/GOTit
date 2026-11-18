import { describe, expect, it } from "vitest";
import { databaseIdentity, libpqConnection, parseRecipients, resolveBackupStoreConfig } from "./config";
import { assertTargetAllowed, compareTables, parseManifest } from "./restore";

const KEY = "age1y9tql0p9fm7uafdptg7glnmy003utp7aejhkpjn89yd0czwmdarsx8am98";

describe("parseRecipients", () => {
  it("verlangt mindestens einen öffentlichen age-Schlüssel", () => {
    expect(() => parseRecipients(undefined)).toThrow(/BACKUP_AGE_RECIPIENTS/);
    expect(() => parseRecipients(" , ")).toThrow(/BACKUP_AGE_RECIPIENTS/);
  });

  it("weist private, SSH- und kaputte Schlüssel ab", () => {
    expect(() => parseRecipients("AGE-SECRET-KEY-1QQQ")).toThrow(/ungültige/);
    expect(() => parseRecipients("ssh-ed25519 AAAA")).toThrow(/ungültige/);
    expect(() => parseRecipients(KEY.slice(0, -1))).toThrow(/ungültige/);
  });

  it("nimmt mehrere Schlüssel und entfernt doppelte", () => {
    expect(parseRecipients(` ${KEY}, ${KEY} `)).toEqual([KEY]);
  });
});

describe("resolveBackupStoreConfig", () => {
  it("liest den Bucket backups mit eigenen Zugangsdaten", () => {
    const config = resolveBackupStoreConfig({
      APP_ENV: "production",
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://s3.example",
      S3_BACKUPS_BUCKET: "backups-x",
      S3_BACKUPS_ACCESS_KEY_ID: "id",
      S3_BACKUPS_SECRET_ACCESS_KEY: "secret",
    });
    expect(config).toMatchObject({ driver: "s3", bucket: "backups-x", region: "auto" });
  });

  it("verlangt in der Produktion s3 und alle Werte", () => {
    expect(() => resolveBackupStoreConfig({ APP_ENV: "production" })).toThrow(/Pflicht/);
    expect(() => resolveBackupStoreConfig({ APP_ENV: "production", STORAGE_DRIVER: "fs" })).toThrow(/nicht erlaubt/);
    expect(() => resolveBackupStoreConfig({ STORAGE_DRIVER: "s3", S3_ENDPOINT: "https://s3.example" })).toThrow(/S3_BACKUPS_BUCKET/);
  });

  it("nutzt lokal fs", () => {
    expect(resolveBackupStoreConfig({ STORAGE_FS_ROOT: "/tmp/x" })).toEqual({ driver: "fs", root: "/tmp/x" });
  });
});

describe("Verbindungen", () => {
  it("nimmt das Passwort aus der URL und gibt es über PGPASSWORD weiter", () => {
    const result = libpqConnection("postgresql://app:p%40ss@db.example:6543/app?sslmode=require");
    expect(result.env).toEqual({ PGPASSWORD: "p@ss" });
    expect(result.dbname).toBe("postgresql://app@db.example:6543/app?sslmode=require");
  });

  it("vergleicht Datenbanken nach Host, Port und Name", () => {
    expect(databaseIdentity("postgresql://a:b@Host.Example/app")).toBe("host.example:5432/app");
    expect(databaseIdentity("postgres://x@host.example:5432/app?sslmode=require")).toBe("host.example:5432/app");
  });

  it("schützt die Produktion ausser mit --i-know", () => {
    const prod = "postgresql://postgres:secret@prod.example:5432/railway";
    expect(() => assertTargetAllowed("postgresql://other:pw@prod.example/railway", [prod])).toThrow(/--i-know/);
    expect(() => assertTargetAllowed("postgresql://other:pw@prod.example/railway", [prod], true)).not.toThrow();
    expect(() => assertTargetAllowed("postgresql://other:pw@prod.example/restore_drill", [prod])).not.toThrow();
    expect(() => assertTargetAllowed("postgresql://x@localhost/app", ["", " "])).not.toThrow();
  });
});

describe("Manifest", () => {
  it("weist fremde oder unvollständige Manifeste ab", () => {
    expect(() => parseManifest("{}")).toThrow(/Format/);
    expect(() => parseManifest(JSON.stringify({ format: "gotit-postgres-backup/1", sha256: "x" }))).toThrow(/SHA-256/);
  });

  it("meldet abweichende Zeilenzahlen", () => {
    expect(compareTables({ "public.a": 1, "public.b": 2 }, { "public.a": 1, "public.c": 0 })).toEqual([
      "public.b: erwartet 2, gefunden fehlt",
      "public.c: erwartet fehlt, gefunden 0",
    ]);
  });
});

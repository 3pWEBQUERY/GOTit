import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createStorageToken, verifyStorageToken, type StorageTokenClaims } from "./upload-token";

const SECRET = "x".repeat(32);
const now = 1_800_000_000_000;
const claims: StorageTokenClaims = { purpose: "upload", bucket: "originals", key: "o/abc", contentType: "image/jpeg", maxBytes: 1000, expiresAt: now + 60_000 };

describe("Speicher-Token", () => {
  it("gilt bis zum Ablauf und nur für seinen Zweck", () => {
    const token = createStorageToken(claims, SECRET);
    expect(verifyStorageToken(token, "upload", SECRET, now)).toEqual(claims);
    expect(verifyStorageToken(token, "upload", SECRET, now + 60_001)).toBeNull();
    expect(verifyStorageToken(token, "download", SECRET, now)).toBeNull();
  });

  it("weist veränderte, fremd signierte und kaputte Tokens ab", () => {
    const token = createStorageToken(claims, SECRET);
    const [payload, signature] = token.split(".") as [string, string];
    const forged = Buffer.from(JSON.stringify({ ...claims, maxBytes: 10_000_000 })).toString("base64url");
    expect(verifyStorageToken(`${forged}.${signature}`, "upload", SECRET, now)).toBeNull();
    expect(verifyStorageToken(`${payload}.${signature}x`, "upload", SECRET, now)).toBeNull();
    expect(verifyStorageToken(createStorageToken(claims, "y".repeat(32)), "upload", SECRET, now)).toBeNull();
    expect(verifyStorageToken("abc", "upload", SECRET, now)).toBeNull();
    expect(verifyStorageToken(null, "upload", SECRET, now)).toBeNull();
  });

  it("verwendet ein eigenes Präfix: Mit dem Präfix des Echtzeit-Tokens signiert gilt es nicht", () => {
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const foreign = `${payload}.${createHmac("sha256", SECRET).update(`realtime:${payload}`).digest("base64url")}`;
    expect(verifyStorageToken(foreign, "upload", SECRET, now)).toBeNull();
  });

  it("verlangt ein Geheimnis mit mindestens 32 Zeichen", () => {
    expect(() => createStorageToken(claims, "kurz")).toThrow();
    expect(() => createStorageToken(claims, undefined)).toThrow();
  });
});

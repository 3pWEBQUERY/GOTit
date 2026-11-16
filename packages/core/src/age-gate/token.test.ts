import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./return-path";
import { AGE_TOKEN_MAX_AGE_MS, createAgeToken, verifyAgeToken } from "./token";

const secret = "a".repeat(32);
const now = 1_800_000_000_000;

describe("Altersprüfung: Token", () => {
  it("akzeptiert ein frisches Token", () => {
    expect(verifyAgeToken(createAgeToken(secret, now), secret, now + 1000)).toBe(true);
  });
  it("lehnt fehlende, manipulierte und fremd signierte Token ab", () => {
    const token = createAgeToken(secret, now);
    expect(verifyAgeToken(undefined, secret, now)).toBe(false);
    expect(verifyAgeToken("1", secret, now)).toBe(false);
    expect(verifyAgeToken(token.replace(/^\d/, "9"), secret, now)).toBe(false);
    expect(verifyAgeToken(createAgeToken("b".repeat(32), now), secret, now)).toBe(false);
    expect(verifyAgeToken(`${token}.x`, secret, now)).toBe(false);
  });
  it("lässt Token nach 24 Stunden ablaufen und akzeptiert keine aus der Zukunft", () => {
    const token = createAgeToken(secret, now);
    expect(verifyAgeToken(token, secret, now + AGE_TOKEN_MAX_AGE_MS + 1)).toBe(false);
    expect(verifyAgeToken(token, secret, now - 1)).toBe(false);
  });
  it("verlangt ein Geheimnis mit mindestens 32 Zeichen", () => {
    expect(() => createAgeToken("kurz", now)).toThrow();
    expect(() => createAgeToken(undefined, now)).toThrow();
  });
});

describe("Rücksprungziel", () => {
  it("lässt nur Pfade der eigenen Anwendung zu", () => {
    expect(safeReturnPath("/de/suche?q=a", "/de")).toBe("/de/suche?q=a");
    expect(safeReturnPath("https://boese.example", "/de")).toBe("/de");
    expect(safeReturnPath("//boese.example", "/de")).toBe("/de");
    expect(safeReturnPath("/\\boese.example", "/de")).toBe("/de");
    expect(safeReturnPath(null, "/de")).toBe("/de");
  });
});

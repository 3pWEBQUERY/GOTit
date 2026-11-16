import { describe, expect, it } from "vitest";
import { localeFromUrl } from "./mail";

describe("Sprache der Auth-E-Mails", () => {
  it("liest die Sprache aus dem Rücksprungziel", () => {
    expect(localeFromUrl("https://app.test/api/auth/verify-email?token=x&callbackURL=%2Ffr%2Finscription%2Fconfirmer")).toBe("fr");
    expect(localeFromUrl("https://app.test/api/auth/reset-password/x?callbackURL=%2Fit%2Fpassword%2Fnuovo")).toBe("it");
  });
  it("fällt ohne erkennbare Sprache auf Deutsch zurück", () => {
    expect(localeFromUrl("https://app.test/api/auth/verify-email?token=x")).toBe("de");
    expect(localeFromUrl("https://app.test/api/auth/verify-email?token=x&callbackURL=%2Fxx%2Fseite")).toBe("de");
  });
});

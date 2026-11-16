import { describe, expect, it } from "vitest";
import { resolveMailTransport } from "./config";

describe("E-Mail-Versand", () => {
  it("gilt ohne Konfiguration als nicht eingerichtet", () => {
    expect(resolveMailTransport({})).toBeNull();
  });
  it("verlangt für SMTP Adresse und Absender", () => {
    expect(resolveMailTransport({ MAIL_TRANSPORT: "smtp", SMTP_URL: "smtp://x" })).toBeNull();
    expect(resolveMailTransport({ MAIL_TRANSPORT: "smtp", SMTP_URL: "smtp://x", MAIL_FROM: "a@b.test" })).toBe("smtp");
  });
  it("erlaubt den Ausgang nie in der Produktion", () => {
    expect(resolveMailTransport({ MAIL_TRANSPORT: "outbox", NODE_ENV: "production" })).toBeNull();
    expect(resolveMailTransport({ MAIL_TRANSPORT: "outbox", NODE_ENV: "test" })).toBe("outbox");
  });
});

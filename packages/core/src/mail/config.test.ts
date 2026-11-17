import { describe, expect, it } from "vitest";
import { resolveMailTransport } from "./config";

describe("E-Mail-Versand", () => {
  it("gilt ohne Konfiguration als nicht eingerichtet", () => {
    expect(resolveMailTransport({})).toBeNull();
  });
  it("verlangt für SMTP Adresse und Absender", () => {
    expect(
      resolveMailTransport({ MAIL_TRANSPORT: "smtp", SMTP_URL: "smtp://x" }),
    ).toBeNull();
    expect(
      resolveMailTransport({
        MAIL_TRANSPORT: "smtp",
        SMTP_URL: "smtp://x",
        MAIL_FROM: "a@b.test",
      }),
    ).toBe("smtp");
  });
  it("verlangt für Resend Schlüssel und Absender", () => {
    expect(
      resolveMailTransport({ MAIL_TRANSPORT: "resend", MAIL_FROM: "a@b.test" }),
    ).toBeNull();
    expect(
      resolveMailTransport({
        MAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "re_test",
      }),
    ).toBeNull();
    expect(
      resolveMailTransport({
        MAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "re_test",
        MAIL_FROM: "a@b.test",
        APP_ENV: "production",
      }),
    ).toBe("resend");
  });
  it("erlaubt den Ausgang nie in der Produktionsumgebung, wohl aber in einem Test-Build", () => {
    expect(
      resolveMailTransport({ MAIL_TRANSPORT: "outbox", APP_ENV: "production" }),
    ).toBeNull();
    expect(
      resolveMailTransport({
        MAIL_TRANSPORT: "outbox",
        APP_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBeNull();
    expect(
      resolveMailTransport({
        MAIL_TRANSPORT: "outbox",
        NODE_ENV: "production",
      }),
    ).toBe("outbox");
    expect(
      resolveMailTransport({ MAIL_TRANSPORT: "outbox", APP_ENV: "staging" }),
    ).toBe("outbox");
  });
});

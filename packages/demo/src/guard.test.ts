import { describe, expect, it } from "vitest";
import { checkDemoEnvironment, demoPassword } from "./guard";

describe("checkDemoEnvironment", () => {
  it("verweigert die Produktion ohne ausdrückliche Freigabe", () => {
    expect(checkDemoEnvironment({ APP_ENV: "production" }).ok).toBe(false);
    expect(checkDemoEnvironment({ APP_ENV: "production", NODE_ENV: "development" }).ok).toBe(false);
    expect(checkDemoEnvironment({ NODE_ENV: "production" }).ok).toBe(false);
    expect(checkDemoEnvironment({ APP_ENV: "production", DEMO_ALLOW_PRODUCTION: "true" }).ok).toBe(false);
  });

  it("erlaubt die Produktion nur mit DEMO_ALLOW_PRODUCTION=1", () => {
    expect(checkDemoEnvironment({ APP_ENV: "production", DEMO_ALLOW_PRODUCTION: "1" })).toEqual({ ok: true, environment: "production" });
    expect(checkDemoEnvironment({ NODE_ENV: "production", DEMO_ALLOW_PRODUCTION: "1" }).ok).toBe(false);
  });

  it("verweigert unbekannte Umgebungen", () => {
    expect(checkDemoEnvironment({ APP_ENV: "prod" }).ok).toBe(false);
    expect(checkDemoEnvironment({ APP_ENV: "preview" }).ok).toBe(false);
  });

  it("erlaubt Staging, Entwicklung, Tests und lokal ohne APP_ENV", () => {
    expect(checkDemoEnvironment({ APP_ENV: "staging", NODE_ENV: "production" })).toEqual({ ok: true, environment: "staging" });
    expect(checkDemoEnvironment({ APP_ENV: "development" }).ok).toBe(true);
    expect(checkDemoEnvironment({ APP_ENV: "test" }).ok).toBe(true);
    expect(checkDemoEnvironment({})).toEqual({ ok: true, environment: "lokal" });
  });
});

describe("demoPassword", () => {
  it("ohne DEMO_PASSWORD kein Passwort", () => {
    expect(demoPassword({})).toBeNull();
    expect(demoPassword({ DEMO_PASSWORD: "" })).toBeNull();
  });

  it("verlangt mindestens zwölf Zeichen", () => {
    expect(() => demoPassword({ DEMO_PASSWORD: "zu-kurz" })).toThrow();
    expect(demoPassword({ DEMO_PASSWORD: "lang-genug-123" })).toBe("lang-genug-123");
  });

  it("in der Produktion nie ein Passwort", () => {
    expect(demoPassword({ APP_ENV: "production", DEMO_PASSWORD: "lang-genug-123" })).toBeNull();
  });
});

import { Redis } from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { consumeRateLimit } from "./limiter";
import { clientIp, rateLimitSubject } from "./subject";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
afterAll(() => redis.disconnect());

describe("Rate Limits (PRD 16.2)", () => {
  it("lässt bis zur Grenze durch und sperrt danach mit Wartezeit", async () => {
    const subject = `test-${Date.now()}-${Math.random()}`;
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) results.push(await consumeRateLimit("registration", subject, redis));
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("hasht den Schlüssel und normalisiert die E-Mail", () => {
    expect(rateLimitSubject("1.2.3.4", "Person@Fiktiv.test")).toBe(rateLimitSubject("1.2.3.4", "person@fiktiv.test"));
    expect(rateLimitSubject("1.2.3.4", "person@fiktiv.test")).not.toContain("fiktiv");
  });

  it("liest die Adresse aus x-real-ip und ignoriert das fälschbare x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6" }))).toBe("unknown");
  });
});

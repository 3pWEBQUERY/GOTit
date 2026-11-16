import { getDb } from "@app/db";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAuth } from "./server";

/** Läuft gegen echte Dienste (Postgres, Redis), wie in der CI. */
const email = `integration-${Date.now()}@fiktiv.test`;
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const queue = new Queue("email", { connection });

beforeAll(async () => {
  await queue.drain(true);
});

afterAll(async () => {
  await getDb().user.deleteMany({ where: { email } });
  await queue.close();
  connection.disconnect();
});

describe("Registrierung (PRD 7.4, 16.2)", () => {
  it("ist über den öffentlichen HTTP-Pfad gesperrt", async () => {
    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email, password: "ein-langes-passwort", name: "Fiktiv" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(await getDb().user.count({ where: { email } })).toBe(0);
  });

  it("legt über den Server ein unbestätigtes Konto an und stellt die Bestätigung in die Queue", async () => {
    await getAuth().api.signUpEmail({ body: { email, password: "ein-langes-passwort", name: "Fiktiv", callbackURL: "/fr/inscription/confirmer" } });
    const user = await getDb().user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerified).toBe(false);
    const jobs = await queue.getJobs(["waiting", "delayed"]);
    const job = jobs.find((candidate) => candidate.data.to === email);
    expect(job?.data).toMatchObject({ template: "verify-email", locale: "fr" });
    expect(job?.data.url).toContain("/api/auth/verify-email?token=");
  });

  it("verweigert die Anmeldung, solange die E-Mail-Adresse nicht bestätigt ist", async () => {
    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-real-ip": `10.0.0.${Date.now() % 250}` },
        body: JSON.stringify({ email, password: "ein-langes-passwort" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie") ?? "").not.toContain("session_token=");
  });
});

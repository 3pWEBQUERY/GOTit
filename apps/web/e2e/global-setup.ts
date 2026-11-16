import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { request, type FullConfig } from "@playwright/test";

const ACCOUNTS = ["mitglied", "anbieter", "entwurf", "club"] as const;
const TEST_PASSWORD = "nur-fuer-tests-0000";
export const AUTH_DIR = join(import.meta.dirname, ".auth");

/**
 * Meldet jedes fiktive Testkonto einmal an und speichert die Sitzung. Die
 * Anmeldung ist rate-limitiert (PRD 16.2); die Tests respektieren das, statt
 * die Grenze abzuschalten.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  mkdirSync(AUTH_DIR, { recursive: true });
  const baseURL = config.projects[0]?.use.baseURL;
  for (const account of ACCOUNTS) {
    const context = await request.newContext({ baseURL, extraHTTPHeaders: { "x-real-ip": `10.200.0.${ACCOUNTS.indexOf(account) + 1}` } });
    for (let attempt = 0; ; attempt += 1) {
      const response = await context.post("/api/auth/sign-in/email", { data: { email: `${account}@fiktiv.test`, password: TEST_PASSWORD } });
      if (response.ok()) break;
      if (response.status() !== 429 || attempt >= 6) throw new Error(`Anmeldung als ${account} fehlgeschlagen: ${response.status()}`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
    await context.storageState({ path: join(AUTH_DIR, `${account}.json`) });
    await context.dispose();
  }
}

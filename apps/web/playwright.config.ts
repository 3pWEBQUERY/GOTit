import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
const ci = Boolean(process.env.CI);
// E-Mails landen in Tests im Ausgang (Tabelle email_outbox), nie bei echten Empfängern.
const env = { ENABLE_DEV_UI: "1", MAIL_TRANSPORT: "outbox", APP_ENV: "test", IDENTITY_PROVIDER: "test", APP_URL: baseURL };

/** End-to-End-Tests laufen gegen einen Build (CI) oder den Dev-Server (lokal), jeweils mit Worker. */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, locale: "de-CH", timezoneId: "Europe/Zurich" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: ci ? "pnpm start" : "pnpm dev",
      url: `${baseURL}/api/health`,
      reuseExistingServer: !ci,
      timeout: 120_000,
      env,
    },
    {
      command: ci ? "pnpm --filter @app/worker start" : "pnpm --filter @app/worker dev",
      // Der Worker hat keinen HTTP-Port; Playwright wartet nur auf den Start.
      wait: { stdout: /"event":"ready"/ },
      reuseExistingServer: !ci,
      timeout: 60_000,
      env,
    },
  ],
});

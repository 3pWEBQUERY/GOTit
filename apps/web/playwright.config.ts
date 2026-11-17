import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
const ci = Boolean(process.env.CI);
// Echtzeit-Dienst neben der Web-App; der Port folgt dem der Web-App, damit parallele Läufe sich nicht stören (3000 → 4001).
const realtimePort = Number(process.env.E2E_REALTIME_PORT ?? port + 1001);
// E-Mails landen in Tests im Ausgang (Tabelle email_outbox), nie bei echten Empfängern.
const env = { ENABLE_DEV_UI: "1", MAIL_TRANSPORT: "outbox", APP_ENV: "test", IDENTITY_PROVIDER: "test", APP_URL: baseURL, REALTIME_URL: `ws://127.0.0.1:${realtimePort}` };

/** End-to-End-Tests laufen gegen einen Build (CI) oder den Dev-Server (lokal), jeweils mit Worker und Echtzeit-Dienst. */
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
    {
      // Braucht BETTER_AUTH_SECRET und REDIS_URL aus der Umgebung, wie die Web-App.
      command: ci ? "pnpm --filter @app/realtime start" : "pnpm --filter @app/realtime dev",
      url: `http://127.0.0.1:${realtimePort}/health`,
      reuseExistingServer: !ci,
      timeout: 60_000,
      env: { ...env, PORT: String(realtimePort), REALTIME_PORT: String(realtimePort), REALTIME_HOST: "127.0.0.1" },
    },
  ],
});

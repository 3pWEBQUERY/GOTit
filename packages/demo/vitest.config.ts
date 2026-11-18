import { defineConfig } from "vitest/config";

/**
 * `pnpm test` prüft nur die Einheiten. Der Integrationstest schreibt Demoprofile in die gemeinsame
 * Datenbank und liefe sonst parallel zu den Suchtests anderer Pakete (`pnpm test:integration`).
 */
const integration = process.env.DEMO_INTEGRATION === "1";

export default defineConfig({
  test: {
    include: integration ? ["src/**/*.integration.test.ts"] : ["src/**/*.test.ts"],
    exclude: integration ? [] : ["src/**/*.integration.test.ts", "node_modules/**"],
    fileParallelism: false,
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});

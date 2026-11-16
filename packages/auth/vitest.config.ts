import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["src/**/*.test.ts"], env: { APP_URL: "http://localhost:3000" }, fileParallelism: false } });

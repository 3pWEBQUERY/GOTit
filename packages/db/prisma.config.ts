import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ["../../.env", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema",
  migrations: { path: "migrations", seed: "tsx seed/run.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});

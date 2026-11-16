import { config } from "dotenv";
import { getDb } from "../src";
import { seedTestAccounts } from "./fixtures/test-accounts";
import { seedReference } from "./reference/seed-reference";

config({ path: ["../../.env", ".env"], quiet: true });

const withFixtures = process.argv.includes("--fixtures");
if (withFixtures && process.env.NODE_ENV === "production") {
  throw new Error("Fiktive Testkonten werden in der Produktion nicht geladen.");
}

const db = getDb();
await seedReference(db);
if (withFixtures) await seedTestAccounts(db);
await db.$disconnect();
process.stdout.write(`Seed abgeschlossen${withFixtures ? " (mit fiktiven Testkonten)" : ""}.\n`);

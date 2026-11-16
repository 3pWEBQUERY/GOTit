import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL ist nicht gesetzt.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalStore = globalThis as { __appPrisma?: PrismaClient };

/** Ein Client pro Prozess; im Dev-Modus überlebt er Hot Reloads. */
export function getDb(): PrismaClient {
  globalStore.__appPrisma ??= createClient();
  return globalStore.__appPrisma;
}

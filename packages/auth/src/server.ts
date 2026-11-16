import { getDb } from "@app/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  const production = process.env.NODE_ENV === "production";
  return betterAuth({
    appName: process.env.APP_NAME ?? "GOTit",
    baseURL: process.env.APP_URL,
    secret,
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      // Die Registrierung öffnet erst mit Schritt 1.4 (E-Mail-Bestätigung,
      // Schutz vor Massenregistrierung). Bis dahin entstehen Konten nur per Seed.
      disableSignUp: true,
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 30 },
    advanced: { cookiePrefix: "app", useSecureCookies: production },
    telemetry: { enabled: false },
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalStore = globalThis as { __appAuth?: Auth };

export function getAuth(): Auth {
  globalStore.__appAuth ??= createAuth();
  return globalStore.__appAuth;
}

/** Liefert die Konto-ID der Sitzung oder null. Liest nur Cookies, schreibt nichts. */
export async function getSessionUserId(headers: Headers): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers });
  return session?.user.id ?? null;
}

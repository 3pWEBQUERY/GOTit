import { CLIENT_IP_HEADER } from "@app/core/rate-limit";
import { getDb } from "@app/db";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { afterHook, databaseHooks } from "./hooks";
import { queueAuthMail } from "./mail";
import { redisSecondaryStorage } from "./redis-storage";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  const appName = process.env.APP_NAME ?? "GOTit";
  const appUrl = new URL(process.env.APP_URL ?? "http://localhost:3000");
  // Secure-Cookies, sobald die App über HTTPS läuft; hängt nicht an NODE_ENV, das auf Railway nicht gesetzt ist (docs/railway.md).
  const secureCookies = appUrl.protocol === "https:";

  return betterAuth({
    appName,
    baseURL: appUrl.origin,
    secret,
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    secondaryStorage: redisSecondaryStorage,
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, storeSessionInDatabase: true },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => queueAuthMail("reset-password", user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => queueAuthMail("verify-email", user.email, url),
    },
    // Registrierung nur über die Server Action: Sie prüft Alter, Bedingungen und Rate Limit (PRD 16.2).
    disabledPaths: ["/sign-up/email", "/update-user", "/delete-user", "/change-email"],
    rateLimit: {
      enabled: true,
      storage: "secondary-storage",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/two-factor/*": { window: 60, max: 5 },
        "/passkey/*": { window: 60, max: 10 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/send-verification-email": { window: 900, max: 3 },
        // Passwort prüfen oder ändern mit einer bestehenden Sitzung: kein Raten mit einem gestohlenen Cookie.
        "/verify-password": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    hooks: { after: afterHook },
    databaseHooks,
    // Rate Limits nach der Adresse, die Railway am Rand setzt, nicht nach dem fälschbaren x-forwarded-for.
    advanced: { cookiePrefix: "app", useSecureCookies: secureCookies, ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
    telemetry: { enabled: false },
    plugins: [
      twoFactor({ issuer: appName }),
      // Benutzerverifikation (PIN, Biometrie) ist Pflicht: Ein Passkey ersetzt Passwort und zweiten Faktor,
      // auch für den Admin-Zugang (PRD 16.2). «preferred» liesse einen Sicherheitsschlüssel ohne PIN genügen.
      passkey({ rpID: appUrl.hostname, rpName: appName, origin: appUrl.origin, authenticatorSelection: { residentKey: "preferred", userVerification: "required" } }),
      // Muss das letzte Plugin sein: setzt Cookies auch aus Server Actions.
      nextCookies(),
    ],
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

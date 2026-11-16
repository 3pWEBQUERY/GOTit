import { reactivateOnSignIn, recordSecurityEvent } from "@app/core/account";
import type { SecurityEventType } from "@app/db";
import { createAuthMiddleware } from "better-auth/api";

/** Pfade, deren Erfolg ins Änderungsprotokoll gehört (PRD 7.5). */
const PATH_EVENTS: Record<string, SecurityEventType> = {
  "/change-password": "PASSWORD_CHANGED",
  "/reset-password": "PASSWORD_RESET",
  "/two-factor/disable": "TWO_FACTOR_DISABLED",
  "/passkey/verify-registration": "PASSKEY_ADDED",
  "/passkey/delete-passkey": "PASSKEY_REMOVED",
  "/revoke-session": "SESSION_REVOKED",
  "/revoke-other-sessions": "SESSION_REVOKED",
};

export const afterHook = createAuthMiddleware(async (ctx) => {
  const type = PATH_EVENTS[ctx.path];
  const returned = ctx.context.returned;
  if (!type || returned instanceof Error || (returned instanceof Response && !returned.ok)) return;
  const userId = ctx.context.session?.user.id ?? ctx.context.newSession?.user.id;
  if (userId) await recordSecurityEvent(userId, type, ctx.headers?.get("user-agent"));
});

export const databaseHooks = {
  session: {
    create: {
      /** Jede Anmeldung: protokollieren und eine Deaktivierung oder einen Löschantrag aufheben. */
      after: async (session: { userId: string; userAgent?: string | null }) => {
        if (await reactivateOnSignIn(session.userId)) await recordSecurityEvent(session.userId, "ACCOUNT_REACTIVATED", session.userAgent);
        await recordSecurityEvent(session.userId, "SIGN_IN", session.userAgent);
      },
    },
  },
  user: {
    update: {
      /** Änderungen an 2FA und Bestätigung der E-Mail-Adresse protokollieren. */
      before: async (data: Record<string, unknown> & { id?: string }) => {
        const userId = typeof data.id === "string" ? data.id : null;
        if (!userId) return;
        if (data.twoFactorEnabled === true) await recordSecurityEvent(userId, "TWO_FACTOR_ENABLED");
        if (data.emailVerified === true) await recordSecurityEvent(userId, "EMAIL_VERIFIED");
      },
    },
  },
};

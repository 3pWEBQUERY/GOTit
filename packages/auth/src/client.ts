"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser-Client für Anmeldung, zweiten Faktor und Passkeys. Spricht mit
 * `/api/auth` derselben Herkunft; enthält keinen Servercode.
 */
export function createAppAuthClient(onTwoFactorRedirect: () => void) {
  return createAuthClient({
    plugins: [twoFactorClient({ onTwoFactorRedirect }), passkeyClient()],
  });
}

export type AppAuthClient = ReturnType<typeof createAppAuthClient>;

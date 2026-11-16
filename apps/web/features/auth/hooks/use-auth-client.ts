"use client";

import { createAppAuthClient, type AppAuthClient } from "@app/auth/client";
import { useState } from "react";

/** Der zweite Faktor wird über die Antwort erkannt (`twoFactorRedirect`), nicht über den Rückruf. */
const ignoreRedirect = () => undefined;

/** Ein Browser-Client pro Formular, über die Lebensdauer der Komponente stabil. */
export function useAuthClient(): AppAuthClient {
  const [client] = useState(() => createAppAuthClient(ignoreRedirect));
  return client;
}

/** Ob Better Auth nach E-Mail und Passwort den zweiten Faktor verlangt. */
export function requiresTwoFactor(data: unknown): boolean {
  return typeof data === "object" && data !== null && "twoFactorRedirect" in data && data.twoFactorRedirect === true;
}

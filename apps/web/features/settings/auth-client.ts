"use client";

import { createAppAuthClient, type AppAuthClient } from "@app/auth/client";

let client: AppAuthClient | null = null;

/** Browser-Client für Passwort, zweiten Faktor und Passkeys. In den Einstellungen gibt es keine Weiterleitung zum zweiten Faktor. */
export function settingsAuthClient(): AppAuthClient {
  client ??= createAppAuthClient(() => undefined);
  return client;
}

export interface AuthClientError {
  code?: string | undefined;
  status?: number | undefined;
}

/** Übersetzungsschlüssel unter `settings.errors` für einen Fehler des Auth-Clients. */
export function authErrorKey(error: AuthClientError | null | undefined): string {
  if (!error) return "generic";
  if (error.status === 429) return "rateLimited";
  switch (error.code) {
    case "INVALID_PASSWORD":
      return "passwordWrong";
    case "INVALID_CODE":
    case "INVALID_TWO_FACTOR_CODE":
      return "codeInvalid";
    case "SESSION_NOT_FRESH":
    case "SESSION_EXPIRED":
      return "sessionNotFresh";
    case "ERROR_CEREMONY_ABORTED":
    case "AUTH_CANCELLED":
      return "passkeyCancelled";
    case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
      return "passkeyExists";
    case "PASSWORD_TOO_SHORT":
      return "passwordTooShort";
    default:
      return "generic";
  }
}

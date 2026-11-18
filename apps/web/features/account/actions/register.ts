"use server";

import { getAuth } from "@app/auth";
import { safeReturnPath } from "@app/core/age-gate";
import { provisionAccountType, recordConsents, registrationSchema } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import { isMailConfigured } from "@app/core/mail";
import { clientIp, consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { getDb } from "@app/db";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { getPathname } from "@/i18n/navigation";
import { fieldErrorsFromZod, type ActionResult } from "../action-result";

/**
 * Registrierung (PRD 7.4). Prüft Eingaben, Rate Limit und Versand, legt das
 * Konto unbestätigt an und den Datensatz des Kontotyps im Entwurf. Eine schon
 * vergebene Adresse wird nicht verraten (PRD 16.2): Die Antwort ist dieselbe.
 */
export async function register(locale: Locale, input: unknown, returnTo?: string): Promise<ActionResult> {
  if (!isMailConfigured()) return { ok: false, formError: "registrationClosed" };
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const data = parsed.data;

  const requestHeaders = await headers();
  const limit = await consumeRateLimit("registration", rateLimitSubject(clientIp(requestHeaders)));
  if (!limit.allowed) return { ok: false, formError: "rateLimited", retryAfterSeconds: limit.retryAfterSeconds };

  const existing = await getDb().user.findUnique({ where: { email: data.email }, select: { id: true } });
  // Gleich viel Arbeit wie eine neue Registrierung, damit die Antwortzeit die vergebene Adresse nicht verrät.
  if (existing) {
    await hashPassword(data.password);
    return { ok: true };
  }

  // Rückweg nur als eigener Pfad, nie als fremde Adresse (wie `?weiter=` bei der Anmeldung).
  const weiter = safeReturnPath(typeof returnTo === "string" ? returnTo : null, "");
  const callbackURL = getPathname({ href: { pathname: "/registrieren/bestaetigen", query: weiter ? { status: "bestaetigt", weiter } : { status: "bestaetigt" } }, locale });
  const result = await getAuth().api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name, callbackURL },
    headers: requestHeaders,
  });
  await provisionAccountType(result.user.id, data.accountType, { name: data.name, organizationName: data.organizationName, organizationKind: data.organizationKind });
  // Zustimmungen mit Version festhalten (PRD v1 FR-AUTH-001, ConsentRecord).
  await recordConsents(result.user.id, ["TERMS", "PRIVACY", "AGE_CONFIRMATION"]);
  return { ok: true };
}

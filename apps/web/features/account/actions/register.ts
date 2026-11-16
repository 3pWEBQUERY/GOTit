"use server";

import { getAuth } from "@app/auth";
import { provisionAccountType, registrationSchema } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import { isMailConfigured } from "@app/core/mail";
import { clientIp, consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { getDb } from "@app/db";
import { headers } from "next/headers";
import { getPathname } from "@/i18n/navigation";
import { fieldErrorsFromZod, type ActionResult } from "../action-result";

/**
 * Registrierung (PRD 7.4). Prüft Eingaben, Rate Limit und Versand, legt das
 * Konto unbestätigt an und den Datensatz des Kontotyps im Entwurf. Eine schon
 * vergebene Adresse wird nicht verraten (PRD 16.2): Die Antwort ist dieselbe.
 */
export async function register(locale: Locale, input: unknown): Promise<ActionResult> {
  if (!isMailConfigured()) return { ok: false, formError: "registrationClosed" };
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const data = parsed.data;

  const requestHeaders = await headers();
  const limit = await consumeRateLimit("registration", rateLimitSubject(clientIp(requestHeaders)));
  if (!limit.allowed) return { ok: false, formError: "rateLimited", retryAfterSeconds: limit.retryAfterSeconds };

  const existing = await getDb().user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) return { ok: true };

  const callbackURL = getPathname({ href: { pathname: "/registrieren/bestaetigen", query: { status: "bestaetigt" } }, locale });
  const result = await getAuth().api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name, callbackURL },
    headers: requestHeaders,
  });
  await provisionAccountType(result.user.id, data.accountType, { name: data.name, organizationName: data.organizationName, organizationKind: data.organizationKind });
  return { ok: true };
}

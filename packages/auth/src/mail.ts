import { DEFAULT_LOCALE, isLocale, type Locale } from "@app/core/locale";
import { emailJob, enqueue } from "@app/jobs";

/** Sprache der E-Mail aus dem Rücksprungziel (`/fr/...`), sonst Deutsch. */
export function localeFromUrl(url: string): Locale {
  const parsed = new URL(url, "http://localhost");
  const target = parsed.searchParams.get("callbackURL") ?? parsed.searchParams.get("redirectTo") ?? parsed.pathname;
  const segment = new URL(target, "http://localhost").pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

/** Übergibt die E-Mail dem Worker (PRD 14.2). Die Anfrage wartet nicht auf den Versand. */
export async function queueAuthMail(template: "verify-email" | "reset-password", to: string, url: string): Promise<void> {
  await enqueue(emailJob, { to, template, url, locale: localeFromUrl(url) });
}

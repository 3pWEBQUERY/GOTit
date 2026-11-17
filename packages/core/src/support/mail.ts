import { emailJob, enqueue } from "@app/jobs";
import { isLocale, type Locale } from "../locale";
import { createLogger } from "../observability";

const logger = createLogger("support");

const HELP_PATH: Record<Locale, string> = { de: "hilfe", fr: "aide", it: "aiuto", en: "help" };
const CONTACT_PATH: Record<Locale, string> = { de: "kontakt", fr: "contact", it: "contatto", en: "contact" };

/** «S-123»: Nummer der Anfrage, wie sie in E-Mails und im Admin erscheint. */
export function ticketReference(number: number): string {
  return `S-${number}`;
}

/**
 * E-Mail zu einer Supportanfrage (v2 7.8 `/admin/support`): Eingangsbestätigung
 * ohne Inhalt der Anfrage, Antwort mit dem Text des Supports. Ein Fehler beim
 * Einreihen bricht die Aktion nicht ab; die Antwort bleibt im Admin gespeichert.
 */
export async function sendSupportMail(ticket: { email: string; locale: string; number: number }, template: "support-received" | "support-reply", text?: string): Promise<void> {
  const locale: Locale = isLocale(ticket.locale) ? ticket.locale : "de";
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const path = template === "support-received" ? HELP_PATH[locale] : CONTACT_PATH[locale];
  try {
    await enqueue(emailJob, { to: ticket.email, template, locale, url: `${base}/${locale}/${path}`, reference: ticketReference(ticket.number), ...(text ? { text } : {}) });
  } catch (error) {
    logger.error("support_mail_failed", { template, error: error instanceof Error ? error.name : "unknown" });
  }
}

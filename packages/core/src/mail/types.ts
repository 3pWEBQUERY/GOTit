import type { Locale } from "../locale";

/** Vorlagen der Plattform. Jede nennt weder Namen noch Inhalte (PRD 13, Diskretion). */
export const MAIL_TEMPLATES = ["verify-email", "reset-password"] as const;
export type MailTemplate = (typeof MAIL_TEMPLATES)[number];

export interface MailRequest {
  to: string;
  template: MailTemplate;
  locale: Locale;
  /** Link, den die E-Mail enthält. Wird nie protokolliert. */
  url: string;
}

export interface RenderedMail {
  to: string;
  subject: string;
  text: string;
}

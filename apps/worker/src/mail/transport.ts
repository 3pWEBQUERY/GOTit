import { resolveMailTransport, type RenderedMail } from "@app/core/mail";
import { getDb } from "@app/db";
import { createTransport } from "nodemailer";

export type SendMail = (mail: RenderedMail) => Promise<void>;

/**
 * Wählt den Versandweg aus der Umgebung. Ohne Konfiguration wirft der Versand:
 * Der Job schlägt sichtbar fehl, statt eine E-Mail still zu verwerfen.
 */
export function createMailSender(
  env: Record<string, string | undefined> = process.env,
): SendMail {
  const transport = resolveMailTransport(env);
  if (transport === "smtp") {
    const smtp = createTransport(env.SMTP_URL as string);
    return async (mail) => {
      await smtp.sendMail({
        from: env.MAIL_FROM,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
      });
    };
  }
  if (transport === "outbox") {
    return async (mail) => {
      await getDb().emailOutbox.create({ data: mail });
    };
  }
  return async () => {
    throw new Error("E-Mail-Versand ist nicht eingerichtet (MAIL_TRANSPORT).");
  };
}

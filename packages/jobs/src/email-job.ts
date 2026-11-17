import { z } from "zod";
import type { JobDefinition } from "./definitions";

/** Payload der Queue `email`. Enthält den Link, aber nie einen Nachrichteninhalt aus dem Messenger. */
export const emailJobSchema = z.object({
  to: z.email(),
  // Muss MAIL_TEMPLATES in @app/core/mail entsprechen (Test in core/mail).
  template: z.enum(["verify-email", "reset-password", "booking-new", "booking-confirmed", "booking-changed", "booking-cancelled", "booking-upcoming", "support-received", "support-reply"]),
  locale: z.enum(["de", "fr", "it", "en"]),
  url: z.url(),
  // Supportanfragen: Nummer der Anfrage und, bei einer Antwort, ihr Text. Nie Inhalte aus dem Messenger.
  reference: z.string().max(20).optional(),
  text: z.string().max(5000).optional(),
});

export type EmailJob = z.infer<typeof emailJobSchema>;

export const emailJob: JobDefinition<EmailJob> = {
  queue: "email",
  schema: emailJobSchema,
};

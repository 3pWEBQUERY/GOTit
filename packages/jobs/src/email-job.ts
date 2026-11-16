import { z } from "zod";
import type { JobDefinition } from "./definitions";

/** Payload der Queue `email`. Enthält den Link, aber nie einen Nachrichteninhalt aus dem Messenger. */
export const emailJobSchema = z.object({
  to: z.email(),
  template: z.enum(["verify-email", "reset-password"]),
  locale: z.enum(["de", "fr", "it", "en"]),
  url: z.url(),
});

export type EmailJob = z.infer<typeof emailJobSchema>;

export const emailJob: JobDefinition<EmailJob> = { queue: "email", schema: emailJobSchema };

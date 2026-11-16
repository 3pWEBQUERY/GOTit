import { renderMail } from "@app/core/mail";
import type { EmailJob } from "@app/jobs";
import type { SendMail } from "../mail/transport";

/** Rendert die Vorlage in der Sprache der Anfrage und versendet sie. Protokolliert weder Adresse noch Link. */
export function createSendEmailJob(send: SendMail) {
  return async (payload: EmailJob): Promise<void> => {
    await send(renderMail(payload));
  };
}

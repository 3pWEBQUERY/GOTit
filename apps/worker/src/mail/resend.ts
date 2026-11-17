import type { RenderedMail } from "@app/core/mail";

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 15_000;

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Versand über die HTTP-API von Resend (gewählter Anbieter). HTTP statt SMTP,
 * weil Railway ausgehendes SMTP je nach Tarif sperrt. Ein Fehler wirft: BullMQ
 * wiederholt den Job mit Backoff. Der Idempotenzschlüssel verhindert eine
 * doppelte E-Mail, wenn ein Versuch nach dem Senden abbricht. Ins Log kommt nur
 * der HTTP-Status, nie Empfänger oder Inhalt.
 */
export function createResendSender(
  apiKey: string,
  from: string,
  fetcher: FetchLike = fetch,
) {
  return async (mail: RenderedMail, idempotencyKey?: string): Promise<void> => {
    const response = await fetcher(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`Resend antwortete mit Status ${response.status}.`);
  };
}

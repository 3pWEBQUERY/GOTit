import type { Locale } from "../locale";
import de from "./messages/de.json";
import en from "./messages/en.json";
import fr from "./messages/fr.json";
import it from "./messages/it.json";
import type { MailRequest, RenderedMail } from "./types";

const catalogues: Record<Locale, typeof de> = { de, fr, it, en };

/** Baut eine Klartext-E-Mail. Der Betreff ist neutral und nennt weder Namen noch Inhalte. */
export function renderMail(request: MailRequest): RenderedMail {
  const messages = catalogues[request.locale];
  const template = messages[request.template];
  const reference = request.reference ?? "";
  const text = [
    template.intro.replace("{reference}", reference),
    "",
    ...(request.text ? [request.text, ""] : []),
    template.action,
    request.url,
    "",
    template.expiry,
    "",
    messages.appSignature,
  ].join("\n");
  return { to: request.to, subject: template.subject.replace("{reference}", reference).trim(), text };
}

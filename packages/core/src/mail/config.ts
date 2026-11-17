/**
 * Wie E-Mails das Haus verlassen. `resend` (gewählter Anbieter, HTTP-API) braucht
 * `RESEND_API_KEY` und `MAIL_FROM` mit einer bei Resend verifizierten Domain.
 * `smtp` braucht `SMTP_URL` und `MAIL_FROM`.
 * `outbox` schreibt in die Tabelle `email_outbox` und ist nur ausserhalb der
 * Produktion erlaubt (Entwicklung, Tests, Staging). Massgeblich ist `APP_ENV`,
 * die Umgebung des Deployments, nicht `NODE_ENV`: Auch ein Test-Build läuft mit
 * `NODE_ENV=production`. Ohne Konfiguration gilt der Versand als nicht
 * eingerichtet, und Abläufe, die eine E-Mail brauchen, sagen das.
 */
export type MailTransport = "resend" | "smtp" | "outbox";

export function resolveMailTransport(
  env: Record<string, string | undefined> = process.env,
): MailTransport | null {
  const transport = env.MAIL_TRANSPORT;
  if (transport === "resend")
    return env.RESEND_API_KEY && env.MAIL_FROM ? "resend" : null;
  if (transport === "smtp")
    return env.SMTP_URL && env.MAIL_FROM ? "smtp" : null;
  if (transport === "outbox")
    return env.APP_ENV === "production" ? null : "outbox";
  return null;
}

export function isMailConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return resolveMailTransport(env) !== null;
}

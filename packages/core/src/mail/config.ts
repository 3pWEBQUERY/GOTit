/**
 * Wie E-Mails das Haus verlassen. `smtp` braucht `SMTP_URL` und `MAIL_FROM`.
 * `outbox` schreibt in die Tabelle `email_outbox` und ist nur ausserhalb der
 * Produktion erlaubt (Entwicklung, Tests, Staging). Massgeblich ist `APP_ENV`,
 * die Umgebung des Deployments, nicht `NODE_ENV`: Auch ein Test-Build läuft mit
 * `NODE_ENV=production`. Ohne Konfiguration gilt der Versand als nicht
 * eingerichtet, und Abläufe, die eine E-Mail brauchen, sagen das.
 */
export type MailTransport = "smtp" | "outbox";

export function resolveMailTransport(env: Record<string, string | undefined> = process.env): MailTransport | null {
  const transport = env.MAIL_TRANSPORT;
  if (transport === "smtp") return env.SMTP_URL && env.MAIL_FROM ? "smtp" : null;
  if (transport === "outbox") return env.APP_ENV === "production" ? null : "outbox";
  return null;
}

export function isMailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return resolveMailTransport(env) !== null;
}

/**
 * Aufbewahrungsfristen je Datenklasse (PRD 16.2). Der `cron`-Dienst setzt sie
 * durch. Neue Datenklassen bekommen hier ihre Frist, bevor sie gespeichert werden.
 */
export const RETENTION_DAYS = {
  /** Frist zwischen «Löschung beantragen» und endgültiger Löschung; eine Anmeldung bricht ab. */
  accountDeletionGrace: 30,
  /** Sicherheitsprotokoll eines Kontos. */
  securityEvents: 365,
  /** Ausgang für E-Mails in Entwicklung und Tests. */
  emailOutbox: 7,
  /** Abgelaufene Bestätigungs- und Rücksetz-Token. */
  expiredVerifications: 1,
} as const;

export function cutoff(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

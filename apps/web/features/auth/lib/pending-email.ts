/**
 * Die Adresse der laufenden Registrierung, damit «Prüfe dein Postfach» sie
 * nennen kann. Sie liegt nur im sessionStorage dieses Tabs, nie in der URL
 * (PRD 9.2: keine privaten Daten in der URL).
 */
const KEY = "auth.pendingEmail";

export function rememberPendingEmail(email: string): void {
  try {
    window.sessionStorage.setItem(KEY, email);
  } catch {
    // Ohne Speicher nennt die nächste Seite die Adresse nicht; der Ablauf geht trotzdem weiter.
  }
}

export function readPendingEmail(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribePendingEmail(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

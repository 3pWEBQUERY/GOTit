import { randomBytes } from "node:crypto";

/**
 * Schnittstelle zum Prüfdienstleister (PRD 16.1). Die Plattform startet eine
 * Prüfung und erhält später nur das Ergebnis; Ausweisdaten bleiben beim
 * Dienstleister. Ein echter Anbieter ist ein Gate (PRD 16.3) und wird hier als
 * weitere Implementierung ergänzt.
 */
export interface IdentityProvider {
  id: string;
  /** Liefert die Adresse, an die der Browser für die Prüfung geht. */
  startUrl(externalRef: string, returnPath: string): string;
}

/**
 * Test-Dienstleister für Entwicklung, Tests und Staging: Die Prüfperson wählt
 * das Ergebnis auf `/dev/verifizierung/<ref>` selbst. In der Produktion ist er
 * nie verfügbar, damit dort niemand ohne echte Prüfung freigegeben wird.
 */
const testProvider: IdentityProvider = {
  id: "test",
  startUrl: (externalRef, returnPath) => `/dev/verifizierung/${externalRef}?weiter=${encodeURIComponent(returnPath)}`,
};

export function resolveIdentityProvider(env: Record<string, string | undefined> = process.env): IdentityProvider | null {
  if (env.IDENTITY_PROVIDER === "test" && env.APP_ENV !== "production") return testProvider;
  return null;
}

export function newExternalRef(): string {
  return randomBytes(24).toString("base64url");
}

/** Gültigkeit einer bestandenen Prüfung (Entscheid 0009): 12 Monate, danach erneute Prüfung. */
export const IDENTITY_VALIDITY_DAYS = 365;

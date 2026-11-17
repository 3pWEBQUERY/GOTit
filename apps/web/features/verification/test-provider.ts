/**
 * Die Seite des Test-Dienstleisters existiert nur ausserhalb der Produktion und
 * nur, wenn der Test-Dienstleister gewählt ist (Entscheid 0009). Dieselbe
 * Bedingung wie `resolveIdentityProvider` in `@app/core/verification`.
 */
export function isTestProviderEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_ENV !== "production" && env.IDENTITY_PROVIDER === "test";
}

export const TEST_OUTCOMES = {
  approved: { approved: true, ageOver18: true, livenessPassed: true },
  rejected: {
    approved: false,
    ageOver18: true,
    livenessPassed: true,
    failureReason: "document-unreadable",
  },
  "under-age": { approved: false, ageOver18: false, livenessPassed: true },
} as const;
export type TestOutcome = keyof typeof TEST_OUTCOMES;

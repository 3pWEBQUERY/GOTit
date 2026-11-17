/**
 * Kanonischer Host (Entscheid 0015): Better Auth nimmt Anmeldungen nur vom
 * Ursprung aus `APP_URL` an, und Cookies gelten pro Host. Seiten unter
 * `www.thegnd.net` oder der Railway-Domain leiten deshalb dauerhaft auf
 * `APP_URL` um, mit Pfad und Suchparametern. Nur in `production` und
 * `staging`: Lokal und in Tests laufen mehrere Ports nebeneinander.
 * API-Routen und Medien erreicht `proxy.ts` gar nicht; der Gesundheitscheck
 * von Railway bleibt so unberührt.
 */
export interface RequestTarget {
  host: string | null;
  pathname: string;
  search: string;
}

const ACTIVE_ENVIRONMENTS = new Set(["production", "staging"]);

export function canonicalRedirectUrl(target: RequestTarget, env: Record<string, string | undefined> = process.env): string | null {
  if (!ACTIVE_ENVIRONMENTS.has(env.APP_ENV ?? "")) return null;
  let canonical: URL;
  try {
    canonical = new URL(env.APP_URL ?? "");
  } catch {
    return null;
  }
  if (canonical.protocol !== "https:") return null;
  const host = target.host?.split(",")[0]?.trim().toLowerCase();
  if (!host || host === canonical.host) return null;
  return `${canonical.origin}${target.pathname}${target.search}`;
}

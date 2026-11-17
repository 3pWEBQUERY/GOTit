import { clientIp, rateLimitSubject } from "@app/core/rate-limit";
import { headers } from "next/headers";

/** Gehashter Schlüssel der Client-Adresse für Rate Limits ohne Konto (Railway setzt `x-real-ip`). */
export async function ipSubject(scope: string): Promise<string> {
  return rateLimitSubject(scope, clientIp(await headers()));
}

/**
 * Hosts, die als Adresse dieser Plattform gelten: der Host von `APP_URL` und
 * der Host der Anfrage (Vorschau-Umgebungen, eigene Domain).
 */
export async function platformHosts(): Promise<string[]> {
  const hosts = new Set<string>();
  try {
    if (process.env.APP_URL) hosts.add(new URL(process.env.APP_URL).host);
  } catch {
    // Ungültige APP_URL: nur der Host der Anfrage.
  }
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  if (host) hosts.add(host.split(",")[0]?.trim() ?? host);
  return [...hosts];
}

import { createHash } from "node:crypto";

/** Schlüssel aus IP-Adresse und optional E-Mail, gehasht: Redis sieht keine Klartextdaten. */
export function rateLimitSubject(...parts: Array<string | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((part) => (part ?? "").trim().toLowerCase()).join("|"))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Adresse des Clients. Railway setzt `x-real-ip` am Rand des Netzes. Der erste
 * Eintrag von `x-forwarded-for` stammt dagegen vom Client und liesse sich
 * fälschen; er wird deshalb nicht verwendet.
 */
export const CLIENT_IP_HEADER = "x-real-ip";

export function clientIp(headers: Headers): string {
  return headers.get(CLIENT_IP_HEADER)?.trim() || "unknown";
}

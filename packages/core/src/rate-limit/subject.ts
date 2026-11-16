import { createHash } from "node:crypto";

/** Schlüssel aus IP-Adresse und optional E-Mail, gehasht: Redis sieht keine Klartextdaten. */
export function rateLimitSubject(...parts: Array<string | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((part) => (part ?? "").trim().toLowerCase()).join("|"))
    .digest("hex")
    .slice(0, 32);
}

/** Erste Adresse aus `x-forwarded-for` (Railway setzt sie), sonst `unknown`. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

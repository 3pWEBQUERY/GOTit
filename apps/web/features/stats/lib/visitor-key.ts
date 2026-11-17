import { createHash } from "node:crypto";
import type { Viewer } from "@app/core/identity";
import { clientIp } from "@app/core/rate-limit";

/**
 * Kennung eines Besuchers für «einmal pro Besucher und Tag» (Entscheid 0019):
 * das Konto für Angemeldete, sonst ein Hash aus Adresse und Browser. Sie wird
 * nie gespeichert; der Kern hasht sie mit Ziel, Tag und Geheimnis noch einmal
 * und legt nur das Ergebnis für 24 Stunden in Redis.
 */
export function visitorKey(viewer: Viewer, headers: Headers): string {
  if (viewer.kind === "account") return `a:${viewer.userId}`;
  const agent = headers.get("user-agent") ?? "";
  return `v:${createHash("sha256")
    .update(`${clientIp(headers)}|${agent}`)
    .digest("base64url")}`;
}

/** Vorab geladene Seiten (Prefetch) sind kein Aufruf. */
export function isPrefetch(headers: Headers): boolean {
  return (
    headers.get("next-router-prefetch") !== null ||
    headers.get("purpose") === "prefetch" ||
    headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

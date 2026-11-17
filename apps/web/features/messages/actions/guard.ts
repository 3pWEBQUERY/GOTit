import type { AccountViewer } from "@app/core/identity";
import {
  consumeRateLimit,
  rateLimitSubject,
  type RateLimitName,
} from "@app/core/rate-limit";
import { getViewer } from "../../shell/queries/get-viewer";

export type GuardFailure = "sign-in" | "rate-limited";

/**
 * Jede Aktion des Messengers: nur angemeldet, bei Senden, neuen
 * Unterhaltungen, Bildern und Meldungen zusätzlich mit Grenze pro Konto
 * (Entscheid 0014). Ob das Konto beteiligt ist, prüft der Kern.
 */
export async function messagingAccount(
  limit?: RateLimitName,
): Promise<
  { ok: true; viewer: AccountViewer } | { ok: false; reason: GuardFailure }
> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  if (limit) {
    const result = await consumeRateLimit(
      limit,
      rateLimitSubject(viewer.userId),
    );
    if (!result.allowed) return { ok: false, reason: "rate-limited" };
  }
  return { ok: true, viewer };
}

/** Labels und Notizen: nur mit eigener Anbieterrolle. */
export async function providerAccount(): Promise<AccountViewer | null> {
  const viewer = await getViewer();
  if (viewer.kind !== "account" || !viewer.provider) return null;
  return viewer;
}

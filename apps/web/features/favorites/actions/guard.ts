import type { AccountViewer } from "@app/core/identity";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { getViewer } from "../../shell/queries/get-viewer";

export type GuardFailure = "sign-in" | "rate-limited";

/**
 * Jede Änderung an Favoriten, Sammlungen und gespeicherten Suchen: nur
 * angemeldet und höchstens 60 pro Minute und Konto (Entscheid 0013).
 */
export async function mutatingAccount(): Promise<
  { ok: true; viewer: AccountViewer } | { ok: false; reason: GuardFailure }
> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit(
    "favorites",
    rateLimitSubject(viewer.userId),
  );
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  return { ok: true, viewer };
}

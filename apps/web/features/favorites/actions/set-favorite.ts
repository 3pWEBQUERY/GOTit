"use server";

import { setFavorite } from "@app/core/favorites";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";

export type SetFavoriteResult =
  | { ok: true; pressed: boolean }
  | {
      ok: false;
      reason: "sign-in" | "unavailable" | "limit" | "rate-limited" | "generic";
    };

/**
 * Herz auf Karte und Profil (PRD v2 9.3): merkt ein Profil in «Favoriten» oder
 * entfernt es. Nur angemeldet; der Kern prüft, ob das Profil für dieses Konto
 * erreichbar ist, und schreibt nur in die eigene Sammlung.
 */
export async function setFavoriteAction(
  slug: unknown,
  pressed: unknown,
): Promise<SetFavoriteResult> {
  if (typeof slug !== "string" || typeof pressed !== "boolean")
    return { ok: false, reason: "generic" };
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit(
    "favorites",
    rateLimitSubject(viewer.userId),
  );
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  const result = await setFavorite(viewer, slug, pressed);
  if (!result.ok)
    return {
      ok: false,
      reason:
        result.reason === "limit"
          ? "limit"
          : result.reason === "unavailable"
            ? "unavailable"
            : "generic",
    };
  revalidatePath("/[locale]/(shell)/(mitglied)/favoriten", "layout");
  return { ok: true, pressed };
}

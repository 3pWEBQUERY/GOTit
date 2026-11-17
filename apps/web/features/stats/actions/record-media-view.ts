"use server";

import { getPublicProfile } from "@app/core/provider-profile";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { recordMediaViewForSlug } from "@app/core/stats";
import { getViewer } from "../../shell/queries/get-viewer";
import { countableVisitor } from "../lib/countable";

/**
 * Medienaufruf in der Lightbox (Entscheid 0019): nur für ein freigegebenes
 * Medium eines Profils, das der Besucher sehen darf, nie für den Inhaber.
 * Begrenzt wie die Vorschläge der Suche; Fehler bleiben still, denn die
 * Lightbox hängt nie davon ab.
 */
export async function recordMediaViewAction(
  slug: unknown,
  mediaId: unknown,
): Promise<void> {
  if (
    typeof slug !== "string" ||
    typeof mediaId !== "string" ||
    slug.length > 120 ||
    mediaId.length > 64
  )
    return;
  try {
    const viewer = await getViewer();
    const key = await countableVisitor(viewer);
    if (!key) return;
    const limit = await consumeRateLimit(
      "searchSuggest",
      rateLimitSubject("media-view", key),
    );
    if (!limit.allowed) return;
    const result = await getPublicProfile(slug, viewer, { locale: "de" });
    if (
      !result ||
      (result.state !== "ready" && result.state !== "paused") ||
      result.owner
    )
      return;
    // Nur, was der Besucher in der Lightbox wirklich sieht: freigegeben und nicht gesperrt.
    if (
      !result.profile.media.some(
        (media) => media.id === mediaId && !media.locked,
      )
    )
      return;
    await recordMediaViewForSlug(slug, mediaId, key);
  } catch {
    // Zählen darf nie die Ansicht stören.
  }
}

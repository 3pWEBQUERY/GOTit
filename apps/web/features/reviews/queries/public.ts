import { listPublicReviews, type PublicReview } from "@app/core/review";
import { getDb } from "@app/db";
import { cache } from "react";

/**
 * Veröffentlichte Bewertungen eines Profils für `/p/[name]` und den Tab.
 * Ob das Profil für den Betrachter sichtbar ist, entscheidet vorher
 * `loadPublicProfile`; hier zählt nur der Status der Bewertung (Entscheid 0017).
 */
export const loadProfileReviews = cache(
  async (
    slug: string,
    limit: number,
  ): Promise<{ total: number; reviews: PublicReview[] }> => {
    const profile = await getDb().providerProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!profile) return { total: 0, reviews: [] };
    return listPublicReviews(profile.id, limit);
  },
);

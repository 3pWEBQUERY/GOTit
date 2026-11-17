import { getDb } from "@app/db";
import type { Viewer } from "../identity/types";
import { pickLocalizedName, type Locale } from "../locale";
import { getOwnCollection, type CollectionSummary } from "./collections";
import { profileStates } from "./reachability";

/**
 * Ein Eintrag einer Sammlung. Nicht mehr erreichbare Profile (gesperrt,
 * archiviert, Identität abgelaufen) erscheinen ohne Name, Bild und Link: Die
 * Sammlung zeigt nie mehr als die Profilseite selbst (PRD v2 10.1).
 */
export type FavoriteEntry =
  | {
      id: string;
      state: "ready" | "paused" | "members-only";
      slug: string;
      displayName: string;
      regionName: string | null;
      cover: {
        mediaId: string;
        color: string | null;
        alt: string | null;
      } | null;
      addedAt: Date;
    }
  | { id: string; state: "unavailable"; addedAt: Date };

export interface CollectionView {
  collection: CollectionSummary;
  entries: FavoriteEntry[];
}

export async function getCollectionView(
  viewer: Viewer,
  collectionId: string,
  locale: Locale,
): Promise<CollectionView | null> {
  if (viewer.kind !== "account") return null;
  const collection = await getOwnCollection(viewer.userId, collectionId);
  if (!collection) return null;
  const items = await getDb().favorite.findMany({
    where: { collectionId: collection.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true,
      providerProfile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          regions: {
            where: { region: { approved: true } },
            select: {
              region: {
                select: {
                  kind: true,
                  nameDe: true,
                  nameFr: true,
                  nameIt: true,
                  nameEn: true,
                },
              },
            },
          },
          media: {
            where: {
              status: "PUBLISHED",
              visibility: "PUBLIC",
              deletedAt: null,
              width: { not: null },
            },
            orderBy: [
              { isCover: "desc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
            take: 1,
            select: { id: true, dominantColor: true, altText: true },
          },
        },
      },
    },
  });
  const states = await profileStates(
    items.map((item) => item.providerProfile.id),
    viewer,
  );
  const entries = items.map((item): FavoriteEntry => {
    const state = states.get(item.providerProfile.id) ?? null;
    if (!state)
      return { id: item.id, state: "unavailable", addedAt: item.createdAt };
    const profile = item.providerProfile;
    const region = [...profile.regions].sort((a, b) =>
      a.region.kind === b.region.kind ? 0 : a.region.kind === "CITY" ? -1 : 1,
    )[0]?.region;
    const cover = profile.media[0];
    return {
      id: item.id,
      state,
      slug: profile.slug,
      displayName: profile.displayName,
      regionName: region ? pickLocalizedName(region, locale) : null,
      cover: cover
        ? { mediaId: cover.id, color: cover.dominantColor, alt: cover.altText }
        : null,
      addedAt: item.createdAt,
    };
  });
  return { collection, entries };
}

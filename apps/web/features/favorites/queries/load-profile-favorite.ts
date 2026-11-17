import {
  collectionsContaining,
  favoriteSlugs,
  listCollections,
} from "@app/core/favorites";
import type { Viewer } from "@app/core/identity";

export interface ProfileFavoriteData {
  favorite: boolean;
  /** Eigene Sammlungen ohne «Favoriten»; das Herz gilt der Standardsammlung. */
  collections: { id: string; name: string; contains: boolean }[];
}

/** Herz und Menü «Zu Sammlung hinzufügen» auf der Profilseite; null für Besucher. */
export async function loadProfileFavorite(
  viewer: Viewer,
  slug: string,
): Promise<ProfileFavoriteData | null> {
  if (viewer.kind !== "account") return null;
  const [favorites, collections, containing] = await Promise.all([
    favoriteSlugs(viewer, [slug]),
    listCollections(viewer.userId),
    collectionsContaining(viewer.userId, slug),
  ]);
  return {
    favorite: favorites.has(slug),
    collections: collections
      .filter((collection) => !collection.isDefault)
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        contains: containing.has(collection.id),
      })),
  };
}

import {
  collectionsContainingMany,
  getCollectionView,
  listCollections,
  type CollectionSummary,
} from "@app/core/favorites";
import type { AccountViewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { mediaUrl } from "@app/core/media/variants";
import { createHref } from "../../shell/nav/href";

/** Ein Eintrag für die Liste, fertig für den Browser: Nicht mehr verfügbare Einträge tragen nur ihre Id. */
export type EntryItem =
  | {
      id: string;
      state: "ready" | "paused";
      slug: string;
      href: string;
      name: string;
      region: string | null;
      image: { src: string; alt: string | null; color: string | null } | null;
    }
  | { id: string; state: "unavailable" };

export interface CollectionPageData {
  collections: CollectionSummary[];
  current: CollectionSummary;
  entries: EntryItem[];
  /** Für jede Profil-Slug: in welchen Sammlungen sie liegt. Für das Menü eines Eintrags. */
  membership: Record<string, string[]>;
}

/**
 * Daten für `/favoriten` (Standardsammlung, `collectionId` null) und
 * `/favoriten/[sammlung]`. Eine fremde oder unbekannte Id ergibt null, die
 * Seite antwortet dann mit 404 (Entscheid 0013).
 */
export async function loadCollectionPage(
  viewer: AccountViewer,
  locale: Locale,
  collectionId: string | null,
): Promise<CollectionPageData | null> {
  const collections = await listCollections(viewer.userId);
  const targetId =
    collectionId ?? collections.find((collection) => collection.isDefault)?.id;
  if (!targetId) return null;
  const view = await getCollectionView(viewer, targetId, locale);
  if (!view) return null;
  const href = createHref(locale);
  const entries = view.entries.map((entry): EntryItem => {
    if (entry.state === "unavailable")
      return { id: entry.id, state: "unavailable" };
    return {
      id: entry.id,
      // «Nur für Mitglieder» ist für ein angemeldetes Konto wie «bereit».
      state: entry.state === "paused" ? "paused" : "ready",
      slug: entry.slug,
      href: href({ pathname: "/p/[name]", params: { name: entry.slug } }),
      name: entry.displayName,
      region: entry.regionName,
      image: entry.cover
        ? {
            src: mediaUrl(entry.cover.mediaId, 320, "webp"),
            alt: entry.cover.alt,
            color: entry.cover.color,
          }
        : null,
    };
  });
  return {
    collections,
    current: view.collection,
    entries,
    membership: await membershipOf(viewer, collections, entries),
  };
}

async function membershipOf(
  viewer: AccountViewer,
  collections: CollectionSummary[],
  entries: EntryItem[],
): Promise<Record<string, string[]>> {
  const slugs = entries.flatMap((entry) =>
    entry.state === "unavailable" ? [] : [entry.slug],
  );
  if (slugs.length === 0 || collections.length < 2) return {};
  return Object.fromEntries(
    await collectionsContainingMany(viewer.userId, slugs),
  );
}

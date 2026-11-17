import { getDb, Prisma } from "@app/db";
import type { Viewer } from "../identity/types";
import { ensureDefaultCollection, getOwnCollection } from "./collections";
import { profileStates } from "./reachability";
import {
  MAX_ITEMS_PER_COLLECTION,
  favoriteIdSchema,
  moveFavoriteSchema,
  slugSchema,
} from "./schemas";

export type FavoriteResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not-found" | "unavailable" | "limit" | "edge" | "invalid";
    };

/** Nur Profile, die der Betrachter gerade sehen darf, lassen sich merken. */
async function reachableProfileId(
  slug: string,
  viewer: Viewer,
): Promise<string | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  const profile = await getDb().providerProfile.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!profile) return null;
  const state = (await profileStates([profile.id], viewer)).get(profile.id);
  return state === "ready" || state === "paused" ? profile.id : null;
}

async function addTo(
  collectionId: string,
  providerProfileId: string,
): Promise<FavoriteResult> {
  const db = getDb();
  if (
    (await db.favorite.count({ where: { collectionId } })) >=
    MAX_ITEMS_PER_COLLECTION
  )
    return { ok: false, reason: "limit" };
  // Neue Einträge stehen oben: kleinste Sortierzahl zuerst.
  const top = await db.favorite.findFirst({
    where: { collectionId },
    orderBy: { sortOrder: "asc" },
    select: { sortOrder: true },
  });
  try {
    await db.favorite.create({
      data: {
        collectionId,
        providerProfileId,
        sortOrder: (top?.sortOrder ?? 1) - 1,
      },
    });
  } catch (error) {
    // Schon gemerkt: Das Ergebnis ist dasselbe.
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    )
      throw error;
  }
  return { ok: true };
}

/**
 * Herz auf Karte und Profil (PRD v2 9.3): merkt das Profil in «Favoriten»
 * oder entfernt es dort. Idempotent.
 */
export async function setFavorite(
  viewer: Viewer,
  slug: string,
  favorite: boolean,
): Promise<FavoriteResult> {
  if (viewer.kind !== "account") return { ok: false, reason: "not-found" };
  const collectionId = await ensureDefaultCollection(viewer.userId);
  if (!favorite) {
    if (!slugSchema.safeParse(slug).success)
      return { ok: false, reason: "not-found" };
    await getDb().favorite.deleteMany({
      where: { collectionId, providerProfile: { slug } },
    });
    return { ok: true };
  }
  const providerProfileId = await reachableProfileId(slug, viewer);
  if (!providerProfileId) return { ok: false, reason: "unavailable" };
  return addTo(collectionId, providerProfileId);
}

/** In eine eigene Sammlung legen. */
export async function addToCollection(
  viewer: Viewer,
  collectionId: string,
  slug: string,
): Promise<FavoriteResult> {
  if (viewer.kind !== "account") return { ok: false, reason: "not-found" };
  const collection = await getOwnCollection(viewer.userId, collectionId);
  if (!collection) return { ok: false, reason: "not-found" };
  const providerProfileId = await reachableProfileId(slug, viewer);
  if (!providerProfileId) return { ok: false, reason: "unavailable" };
  return addTo(collection.id, providerProfileId);
}

/** Entfernt einen Eintrag. Auch nicht mehr erreichbare Profile lassen sich so aufräumen. */
export async function removeFavorite(
  userId: string,
  favoriteId: string,
): Promise<FavoriteResult> {
  if (!favoriteIdSchema.safeParse(favoriteId).success)
    return { ok: false, reason: "not-found" };
  const { count } = await getDb().favorite.deleteMany({
    where: { id: favoriteId, collection: { userId } },
  });
  return count > 0 ? { ok: true } : { ok: false, reason: "not-found" };
}

/** «Nach oben» und «Nach unten»: tauscht mit dem Nachbarn in derselben Sammlung. */
export async function moveFavorite(
  userId: string,
  favoriteId: string,
  input: unknown,
): Promise<FavoriteResult> {
  const parsed = moveFavoriteSchema.safeParse(input);
  if (!parsed.success || !favoriteIdSchema.safeParse(favoriteId).success)
    return { ok: false, reason: "invalid" };
  const db = getDb();
  const item = await db.favorite.findFirst({
    where: { id: favoriteId, collection: { userId } },
    select: { collectionId: true },
  });
  if (!item) return { ok: false, reason: "not-found" };
  const order = await db.favorite.findMany({
    where: { collectionId: item.collectionId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  const index = order.findIndex((entry) => entry.id === favoriteId);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length)
    return { ok: false, reason: "edge" };
  const ids = order.map((entry) => entry.id);
  [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
  await db.$transaction(
    ids.map((id, position) =>
      db.favorite.update({ where: { id }, data: { sortOrder: position } }),
    ),
  );
  return { ok: true };
}

/** Welche dieser Profile hat das Konto in «Favoriten»? Für die Herzen auf den Karten. */
export async function favoriteSlugs(
  viewer: Viewer,
  slugs: readonly string[],
): Promise<Set<string>> {
  if (viewer.kind !== "account" || slugs.length === 0) return new Set();
  const rows = await getDb().favorite.findMany({
    where: {
      collection: { userId: viewer.userId, isDefault: true },
      providerProfile: { slug: { in: [...slugs] } },
    },
    select: { providerProfile: { select: { slug: true } } },
  });
  return new Set(rows.map((row) => row.providerProfile.slug));
}

/** In welchen Sammlungen liegt dieses Profil? Für das Menü «Zu Sammlung hinzufügen» auf der Profilseite. */
export async function collectionsContaining(
  userId: string,
  slug: string,
): Promise<Set<string>> {
  if (!slugSchema.safeParse(slug).success) return new Set();
  const rows = await getDb().favorite.findMany({
    where: { collection: { userId }, providerProfile: { slug } },
    select: { collectionId: true },
  });
  return new Set(rows.map((row) => row.collectionId));
}

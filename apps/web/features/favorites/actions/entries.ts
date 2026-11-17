"use server";

import {
  addToCollection,
  getOwnCollection,
  moveFavorite,
  removeFromCollection,
  setFavorite,
  type FavoriteResult,
} from "@app/core/favorites";
import { mutatingAccount, type GuardFailure } from "./guard";

export type EntryActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: GuardFailure | "unavailable" | "limit" | "not-found" | "generic";
    };

function fromCore(result: FavoriteResult): EntryActionResult {
  if (result.ok) return { ok: true };
  if (
    result.reason === "unavailable" ||
    result.reason === "limit" ||
    result.reason === "not-found"
  )
    return { ok: false, reason: result.reason };
  return { ok: false, reason: "generic" };
}

/** «Nach oben» und «Nach unten» innerhalb einer eigenen Sammlung. */
export async function moveEntryAction(
  favoriteId: unknown,
  direction: unknown,
): Promise<EntryActionResult> {
  if (typeof favoriteId !== "string") return { ok: false, reason: "generic" };
  const guard = await mutatingAccount();
  if (!guard.ok) return guard;
  return fromCore(
    await moveFavorite(guard.viewer.userId, favoriteId, { direction }),
  );
}

/**
 * Legt ein Profil in eine eigene Sammlung oder nimmt es heraus. Für die
 * Standardsammlung gilt dieselbe Regel wie beim Herz.
 */
export async function setMembershipAction(
  collectionId: unknown,
  slug: unknown,
  member: unknown,
): Promise<EntryActionResult> {
  if (
    typeof collectionId !== "string" ||
    typeof slug !== "string" ||
    typeof member !== "boolean"
  )
    return { ok: false, reason: "generic" };
  const guard = await mutatingAccount();
  if (!guard.ok) return guard;
  const { viewer } = guard;
  const collection = await getOwnCollection(viewer.userId, collectionId);
  if (!collection) return { ok: false, reason: "not-found" };
  if (collection.isDefault)
    return fromCore(await setFavorite(viewer, slug, member));
  return fromCore(
    member
      ? await addToCollection(viewer, collection.id, slug)
      : await removeFromCollection(viewer.userId, collection.id, slug),
  );
}

"use server";

import {
  moveFavorites,
  removeFavorites,
  restoreFavorites,
  type RemovedFavorite,
} from "@app/core/favorites";
import { mutatingAccount, type GuardFailure } from "./guard";

export type BulkFailure = GuardFailure | "limit" | "not-found" | "generic";

/** «In Sammlung verschieben» für einen oder mehrere Einträge (PRD v2 12.1); atomar im Kern. */
export async function moveEntriesAction(
  favoriteIds: unknown,
  targetCollectionId: unknown,
): Promise<{ ok: true; moved: number } | { ok: false; reason: BulkFailure }> {
  if (typeof targetCollectionId !== "string")
    return { ok: false, reason: "generic" };
  const guard = await mutatingAccount();
  if (!guard.ok) return guard;
  const result = await moveFavorites(
    guard.viewer.userId,
    favoriteIds,
    targetCollectionId,
  );
  if (result.ok) return result;
  return {
    ok: false,
    reason: result.reason === "invalid" ? "generic" : result.reason,
  };
}

/** Entfernt Einträge, auch nicht mehr verfügbare. Die Antwort trägt, was «Rückgängig» braucht. */
export async function removeEntriesAction(
  favoriteIds: unknown,
): Promise<
  { ok: true; removed: RemovedFavorite[] } | { ok: false; reason: BulkFailure }
> {
  const guard = await mutatingAccount();
  if (!guard.ok) return guard;
  const result = await removeFavorites(guard.viewer.userId, favoriteIds);
  if (result.ok) return result;
  return {
    ok: false,
    reason: result.reason === "invalid" ? "generic" : result.reason,
  };
}

/** «Rückgängig» im Toast: legt die Einträge an ihren Platz zurück, soweit die Profile noch erreichbar sind. */
export async function restoreEntriesAction(
  removed: unknown,
): Promise<
  { ok: true; restored: number } | { ok: false; reason: BulkFailure }
> {
  const guard = await mutatingAccount();
  if (!guard.ok) return guard;
  const result = await restoreFavorites(guard.viewer, removed);
  if (result.ok) return result;
  return {
    ok: false,
    reason: result.reason === "invalid" ? "generic" : result.reason,
  };
}

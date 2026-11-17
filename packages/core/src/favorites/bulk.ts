import { getDb } from "@app/db";
import { z } from "zod";
import type { Viewer } from "../identity/types";
import { getOwnCollection } from "./collections";
import { profileStates } from "./reachability";
import {
  MAX_ITEMS_PER_COLLECTION,
  collectionIdSchema,
  favoriteIdSchema,
} from "./schemas";

/**
 * Sammelaktionen auf Einträgen (PRD v2 12.1: «In Sammlung verschieben» per
 * Mehrfachauswahl, PRD 13: Entfernen mit «Rückgängig»). Jede Abfrage enthält
 * die Konto-ID; fremde Einträge und Sammlungen verhalten sich wie unbekannte.
 */
const favoriteIdsSchema = z
  .array(favoriteIdSchema)
  .min(1)
  .max(MAX_ITEMS_PER_COLLECTION)
  .transform((ids) => [...new Set(ids)]);

export type MoveFavoritesResult =
  | { ok: true; moved: number }
  | { ok: false; reason: "invalid" | "not-found" | "limit" };

/**
 * Verschiebt eigene Einträge in eine eigene Sammlung, atomar: in der
 * Zielsammlung anlegen (oben, in der bisherigen Reihenfolge) und hier
 * entfernen. Liegt ein Profil schon im Ziel, entfällt nur der Eintrag hier.
 * Passt nicht alles ins Ziel (200), ändert sich nichts. Der Eintrag wird
 * mitgenommen, wie er ist; ein nicht mehr verfügbares Profil bleibt auch im
 * Ziel neutral.
 */
export async function moveFavorites(
  userId: string,
  favoriteIds: unknown,
  targetCollectionId: string,
): Promise<MoveFavoritesResult> {
  const ids = favoriteIdsSchema.safeParse(favoriteIds);
  if (!ids.success) return { ok: false, reason: "invalid" };
  const target = await getOwnCollection(userId, targetCollectionId);
  if (!target) return { ok: false, reason: "not-found" };
  return getDb().$transaction(async (tx) => {
    const items = (
      await tx.favorite.findMany({
        where: { id: { in: ids.data }, collection: { userId } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: { id: true, collectionId: true, providerProfileId: true },
      })
    ).filter((item) => item.collectionId !== target.id);
    if (items.length === 0) return { ok: false, reason: "not-found" } as const;
    const already = new Set(
      (
        await tx.favorite.findMany({
          where: {
            collectionId: target.id,
            providerProfileId: {
              in: items.map((item) => item.providerProfileId),
            },
          },
          select: { providerProfileId: true },
        })
      ).map((row) => row.providerProfileId),
    );
    const added: string[] = [];
    for (const item of items)
      if (
        !already.has(item.providerProfileId) &&
        !added.includes(item.providerProfileId)
      )
        added.push(item.providerProfileId);
    const count = await tx.favorite.count({
      where: { collectionId: target.id },
    });
    if (count + added.length > MAX_ITEMS_PER_COLLECTION)
      return { ok: false, reason: "limit" } as const;
    const top = await tx.favorite.findFirst({
      where: { collectionId: target.id },
      orderBy: { sortOrder: "asc" },
      select: { sortOrder: true },
    });
    const start = (top?.sortOrder ?? 0) - added.length;
    await tx.favorite.createMany({
      data: added.map((providerProfileId, index) => ({
        collectionId: target.id,
        providerProfileId,
        sortOrder: start + index,
      })),
      skipDuplicates: true,
    });
    await tx.favorite.deleteMany({
      where: {
        id: { in: items.map((item) => item.id) },
        collection: { userId },
      },
    });
    return { ok: true, moved: items.length } as const;
  });
}

/** Was «Rückgängig» braucht, um entfernte Einträge an ihren Platz zurückzulegen. */
export interface RemovedFavorite {
  collectionId: string;
  providerProfileId: string;
  sortOrder: number;
  createdAt: string;
}

/** Entfernt eigene Einträge, auch nicht mehr verfügbare. Gibt zurück, was «Rückgängig» braucht. */
export async function removeFavorites(
  userId: string,
  favoriteIds: unknown,
): Promise<
  | { ok: true; removed: RemovedFavorite[] }
  | { ok: false; reason: "invalid" | "not-found" }
> {
  const ids = favoriteIdsSchema.safeParse(favoriteIds);
  if (!ids.success) return { ok: false, reason: "invalid" };
  return getDb().$transaction(async (tx) => {
    const items = await tx.favorite.findMany({
      where: { id: { in: ids.data }, collection: { userId } },
      select: {
        id: true,
        collectionId: true,
        providerProfileId: true,
        sortOrder: true,
        createdAt: true,
      },
    });
    if (items.length === 0) return { ok: false, reason: "not-found" } as const;
    await tx.favorite.deleteMany({
      where: {
        id: { in: items.map((item) => item.id) },
        collection: { userId },
      },
    });
    return {
      ok: true,
      removed: items.map((item) => ({
        collectionId: item.collectionId,
        providerProfileId: item.providerProfileId,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt.toISOString(),
      })),
    } as const;
  });
}

const removedSchema = z
  .array(
    z.object({
      collectionId: collectionIdSchema,
      providerProfileId: z.string().min(1).max(64),
      sortOrder: z.number().int(),
      createdAt: z.coerce.date(),
    }),
  )
  .min(1)
  .max(MAX_ITEMS_PER_COLLECTION);

/**
 * «Rückgängig» nach dem Entfernen: legt die Einträge an Platz und Datum
 * zurück. Wie beim Merken nur in eigene Sammlungen und nur Profile, die das
 * Konto gerade sehen darf; die Grenze von 200 gilt weiter.
 */
export async function restoreFavorites(
  viewer: Viewer,
  input: unknown,
): Promise<
  { ok: true; restored: number } | { ok: false; reason: "invalid" | "limit" }
> {
  if (viewer.kind !== "account") return { ok: false, reason: "invalid" };
  const parsed = removedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const owned = new Set(
    (
      await db.collection.findMany({
        where: {
          userId: viewer.userId,
          id: { in: parsed.data.map((entry) => entry.collectionId) },
        },
        select: { id: true },
      })
    ).map((row) => row.id),
  );
  const states = await profileStates(
    [...new Set(parsed.data.map((entry) => entry.providerProfileId))],
    viewer,
  );
  const entries = parsed.data.filter((entry) => {
    const state = states.get(entry.providerProfileId);
    return (
      owned.has(entry.collectionId) && (state === "ready" || state === "paused")
    );
  });
  if (entries.length === 0) return { ok: true, restored: 0 };
  return db.$transaction(async (tx) => {
    for (const collectionId of new Set(
      entries.map((entry) => entry.collectionId),
    )) {
      const count = await tx.favorite.count({ where: { collectionId } });
      const adding = entries.filter(
        (entry) => entry.collectionId === collectionId,
      ).length;
      if (count + adding > MAX_ITEMS_PER_COLLECTION)
        return { ok: false, reason: "limit" } as const;
    }
    const { count } = await tx.favorite.createMany({
      data: entries,
      skipDuplicates: true,
    });
    return { ok: true, restored: count } as const;
  });
}

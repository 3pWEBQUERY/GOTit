import { getDb, Prisma } from "@app/db";
import {
  COLLECTION_NAME_MAX,
  MAX_COLLECTIONS,
  collectionIdSchema,
  collectionNameSchema,
} from "./schemas";

/**
 * Private Sammlungen (PRD v1 5.6). Jede Abfrage enthält die Konto-ID: Eine
 * fremde Sammlung verhält sich wie eine unbekannte. Die Standardsammlung
 * «Favoriten» hat einen leeren gespeicherten Namen; die Oberfläche zeigt ihn
 * übersetzt. Sie lässt sich weder umbenennen noch löschen.
 */
export interface CollectionSummary {
  id: string;
  /** Leer bei der Standardsammlung. */
  name: string;
  isDefault: boolean;
  count: number;
}

export type CollectionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason: "invalid" | "duplicate" | "limit" | "not-found" | "default";
    };

export async function ensureDefaultCollection(userId: string): Promise<string> {
  const db = getDb();
  const existing = await db.collection.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (existing) return existing.id;
  try {
    return (
      await db.collection.create({
        data: { userId, name: "", isDefault: true },
        select: { id: true },
      })
    ).id;
  } catch (error) {
    // Gleichzeitig angelegt: die vorhandene nehmen.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return (
        await db.collection.findFirstOrThrow({
          where: { userId, isDefault: true },
          select: { id: true },
        })
      ).id;
    }
    throw error;
  }
}

export async function listCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  await ensureDefaultCollection(userId);
  const rows = await getDb().collection.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      isDefault: true,
      _count: { select: { items: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    count: row._count.items,
  }));
}

export async function getOwnCollection(
  userId: string,
  collectionId: string,
): Promise<CollectionSummary | null> {
  if (!collectionIdSchema.safeParse(collectionId).success) return null;
  const row = await getDb().collection.findFirst({
    where: { id: collectionId, userId },
    select: {
      id: true,
      name: true,
      isDefault: true,
      _count: { select: { items: true } },
    },
  });
  return row
    ? {
        id: row.id,
        name: row.name,
        isDefault: row.isDefault,
        count: row._count.items,
      }
    : null;
}

function isDuplicate(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createCollection(
  userId: string,
  input: unknown,
): Promise<CollectionResult> {
  const parsed = collectionNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  await ensureDefaultCollection(userId);
  if ((await db.collection.count({ where: { userId } })) >= MAX_COLLECTIONS)
    return { ok: false, reason: "limit" };
  try {
    const created = await db.collection.create({
      data: {
        userId,
        name: parsed.data,
        sortOrder: Date.now() % 2_000_000_000,
      },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

export async function renameCollection(
  userId: string,
  collectionId: string,
  input: unknown,
): Promise<CollectionResult> {
  const parsed = collectionNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const collection = await getOwnCollection(userId, collectionId);
  if (!collection) return { ok: false, reason: "not-found" };
  if (collection.isDefault) return { ok: false, reason: "default" };
  try {
    await getDb().collection.update({
      where: { id: collection.id },
      data: { name: parsed.data },
    });
    return { ok: true, id: collection.id };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

/** Löscht eine eigene Sammlung samt ihren Einträgen; die Profile selbst bleiben unberührt. */
export async function deleteCollection(
  userId: string,
  collectionId: string,
): Promise<CollectionResult> {
  const collection = await getOwnCollection(userId, collectionId);
  if (!collection) return { ok: false, reason: "not-found" };
  if (collection.isDefault) return { ok: false, reason: "default" };
  await getDb().collection.deleteMany({
    where: { id: collection.id, userId, isDefault: false },
  });
  return { ok: true, id: collection.id };
}

export { COLLECTION_NAME_MAX };

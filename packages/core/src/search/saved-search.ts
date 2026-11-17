import { getDb, Prisma } from "@app/db";
import { z } from "zod";
import {
  filtersOnly,
  parseSearchQuery,
  queryKey,
  toSearchParams,
  type SearchQuery,
} from "./query";

/**
 * Gespeicherte Suchen (PRD v1 FR-SEARCH-005, v2 7.5 `/suchen`). Gespeichert
 * werden nur die normalisierten Filter, nie Sortierung, Ansicht oder Seite.
 * Gleiche Filter ergeben keinen zweiten Eintrag.
 */
export const MAX_SAVED_SEARCHES = 50;
export const SAVED_SEARCH_NAME_MAX = 60;

const nameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(SAVED_SEARCH_NAME_MAX));
const idSchema = z.string().min(1).max(64);

export interface SavedSearchSummary {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
}

export type SaveSearchResult =
  | { ok: true; id: string; existed: boolean }
  | { ok: false; reason: "invalid" | "empty" | "limit" | "not-found" };

export async function saveSearch(
  userId: string,
  query: SearchQuery,
  name: unknown,
): Promise<SaveSearchResult> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) return { ok: false, reason: "invalid" };
  const filters = filtersOnly(query);
  const key = queryKey(filters);
  if (key === "") return { ok: false, reason: "empty" };
  const db = getDb();
  const existing = await db.savedSearch.findUnique({
    where: { userId_queryKey: { userId, queryKey: key } },
    select: { id: true },
  });
  if (existing) return { ok: true, id: existing.id, existed: true };
  if ((await db.savedSearch.count({ where: { userId } })) >= MAX_SAVED_SEARCHES)
    return { ok: false, reason: "limit" };
  try {
    const created = await db.savedSearch.create({
      data: {
        userId,
        name: parsedName.data,
        queryKey: key,
        query: toSearchParams(filters) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return { ok: true, id: created.id, existed: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const again = await db.savedSearch.findUniqueOrThrow({
        where: { userId_queryKey: { userId, queryKey: key } },
        select: { id: true },
      });
      return { ok: true, id: again.id, existed: true };
    }
    throw error;
  }
}

/** Ist diese Filterkombination schon gespeichert? Für den Zustand des Buttons «Suche speichern». */
export async function findSavedSearch(
  userId: string,
  query: SearchQuery,
): Promise<string | null> {
  const key = queryKey(query);
  if (key === "") return null;
  const row = await getDb().savedSearch.findUnique({
    where: { userId_queryKey: { userId, queryKey: key } },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function listSavedSearches(
  userId: string,
): Promise<SavedSearchSummary[]> {
  const rows = await getDb().savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, query: true, createdAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    query: parseSearchQuery(
      (row.query ?? {}) as Record<string, string | string[]>,
    ),
  }));
}

export async function renameSavedSearch(
  userId: string,
  id: string,
  name: unknown,
): Promise<SaveSearchResult> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success || !idSchema.safeParse(id).success)
    return { ok: false, reason: "invalid" };
  const { count } = await getDb().savedSearch.updateMany({
    where: { id, userId },
    data: { name: parsedName.data },
  });
  return count > 0
    ? { ok: true, id, existed: true }
    : { ok: false, reason: "not-found" };
}

export async function deleteSavedSearch(
  userId: string,
  id: string,
): Promise<boolean> {
  if (!idSchema.safeParse(id).success) return false;
  const { count } = await getDb().savedSearch.deleteMany({
    where: { id, userId },
  });
  return count > 0;
}

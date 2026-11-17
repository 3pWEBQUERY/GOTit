import { z } from "zod";

export const MAX_COLLECTIONS = 20;
export const MAX_ITEMS_PER_COLLECTION = 200;
export const COLLECTION_NAME_MAX = 40;

const id = z.string().min(1).max(64);
export const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const collectionIdSchema = id;
export const favoriteIdSchema = id;

/** Name einer eigenen Sammlung. Leerzeichen am Rand fallen weg, Zeilenumbrüche nicht erlaubt. */
export const collectionNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "required").max(COLLECTION_NAME_MAX, "too-long"));

export const moveFavoriteSchema = z.object({
  direction: z.enum(["up", "down"]),
});

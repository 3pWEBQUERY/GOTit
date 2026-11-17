"use server";

import {
  collectionNameSchema,
  createCollection,
  deleteCollection,
  renameCollection,
  type CollectionResult,
} from "@app/core/favorites";
import type { ActionResult } from "../../account/action-result";
import { mutatingAccount } from "./guard";

export type CollectionActionResult = ActionResult<{ id: string; name: string }>;

/** Fehler am Feld «Name»: «required», «too-long», «duplicate», «limit». */
function nameError(input: unknown): string | null {
  const parsed = collectionNameSchema.safeParse(
    typeof input === "string" ? input : "",
  );
  return parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? "required");
}

function fromCore(
  result: CollectionResult,
  name: string,
): CollectionActionResult {
  if (result.ok) return { ok: true, data: { id: result.id, name } };
  if (result.reason === "duplicate" || result.reason === "limit")
    return { ok: false, fieldErrors: { name: result.reason } };
  if (result.reason === "invalid")
    return { ok: false, fieldErrors: { name: "required" } };
  return {
    ok: false,
    formError: result.reason === "not-found" ? "not-found" : "generic",
  };
}

/** Neue eigene Sammlung (PRD v1 5.6). Höchstens 20, Namen eindeutig pro Konto. */
export async function createCollectionAction(
  name: unknown,
): Promise<CollectionActionResult> {
  const invalid = nameError(name);
  if (invalid) return { ok: false, fieldErrors: { name: invalid } };
  const guard = await mutatingAccount();
  if (!guard.ok) return { ok: false, formError: guard.reason };
  const clean = collectionNameSchema.parse(name);
  return fromCore(await createCollection(guard.viewer.userId, clean), clean);
}

/** Umbenennen; die Standardsammlung «Favoriten» lehnt der Kern ab. */
export async function renameCollectionAction(
  collectionId: unknown,
  name: unknown,
): Promise<CollectionActionResult> {
  if (typeof collectionId !== "string")
    return { ok: false, formError: "generic" };
  const invalid = nameError(name);
  if (invalid) return { ok: false, fieldErrors: { name: invalid } };
  const guard = await mutatingAccount();
  if (!guard.ok) return { ok: false, formError: guard.reason };
  const clean = collectionNameSchema.parse(name);
  return fromCore(
    await renameCollection(guard.viewer.userId, collectionId, clean),
    clean,
  );
}

/** Löscht eine eigene Sammlung samt Einträgen; die Profile bleiben unberührt. */
export async function deleteCollectionAction(
  collectionId: unknown,
): Promise<ActionResult> {
  if (typeof collectionId !== "string")
    return { ok: false, formError: "generic" };
  const guard = await mutatingAccount();
  if (!guard.ok) return { ok: false, formError: guard.reason };
  const result = await deleteCollection(guard.viewer.userId, collectionId);
  return result.ok
    ? { ok: true }
    : {
        ok: false,
        formError: result.reason === "not-found" ? "not-found" : "generic",
      };
}

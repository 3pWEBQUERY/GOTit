"use server";

import {
  SAVED_SEARCH_NAME_MAX,
  deleteSavedSearch,
  renameSavedSearch,
} from "@app/core/search";
import type { ActionResult } from "../../account/action-result";
import { mutatingAccount } from "./guard";

function nameError(input: unknown): string | null {
  const name =
    typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
  if (name.length === 0) return "required";
  return name.length > SAVED_SEARCH_NAME_MAX ? "too-long" : null;
}

/** Umbenennen einer gespeicherten Suche (PRD v2 7.5 `/suchen`). */
export async function renameSavedSearchAction(
  id: unknown,
  name: unknown,
): Promise<ActionResult<{ name: string }>> {
  if (typeof id !== "string") return { ok: false, formError: "generic" };
  const invalid = nameError(name);
  if (invalid) return { ok: false, fieldErrors: { name: invalid } };
  const guard = await mutatingAccount();
  if (!guard.ok) return { ok: false, formError: guard.reason };
  const result = await renameSavedSearch(guard.viewer.userId, id, name);
  if (result.ok)
    return {
      ok: true,
      data: { name: String(name).replace(/\s+/g, " ").trim() },
    };
  return {
    ok: false,
    formError: result.reason === "not-found" ? "not-found" : "generic",
  };
}

/** Löscht eine gespeicherte Suche; die Oberfläche fragt vorher nach. */
export async function deleteSavedSearchAction(
  id: unknown,
): Promise<ActionResult> {
  if (typeof id !== "string") return { ok: false, formError: "generic" };
  const guard = await mutatingAccount();
  if (!guard.ok) return { ok: false, formError: guard.reason };
  return (await deleteSavedSearch(guard.viewer.userId, id))
    ? { ok: true }
    : { ok: false, formError: "not-found" };
}

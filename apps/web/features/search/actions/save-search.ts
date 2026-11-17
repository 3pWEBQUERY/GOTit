"use server";

import { LOCALES, type Locale } from "@app/core/locale";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";
import { deleteSavedSearch, saveSearch } from "@app/core/search";
import { parseSearchQuery, type RawParams } from "@app/core/search/query";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { getViewer } from "../../shell/queries/get-viewer";
import { filterLabels, savedSearchName } from "../filter-labels";
import {
  filterLabelSource,
  loadFilterOptions,
} from "../queries/filter-options";

export type SaveSearchActionResult =
  | { ok: true; id: string | null }
  | {
      ok: false;
      reason: "sign-in" | "empty" | "limit" | "rate-limited" | "generic";
    };

function isRawParams(value: unknown): value is RawParams {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (entry) =>
        entry === undefined ||
        typeof entry === "string" ||
        (Array.isArray(entry) &&
          entry.every((item) => typeof item === "string")),
    )
  );
}

async function guard(): Promise<
  { userId: string } | Exclude<SaveSearchActionResult, { ok: true }>
> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, reason: "sign-in" };
  const limit = await consumeRateLimit(
    "favorites",
    rateLimitSubject(viewer.userId),
  );
  if (!limit.allowed) return { ok: false, reason: "rate-limited" };
  return { userId: viewer.userId };
}

/**
 * «Suche speichern» (PRD v1 FR-SEARCH-005): speichert die Filter der
 * aktuellen URL unter einem Namen aus den Filtern, zum Beispiel «Zürich ·
 * Deutsch · Fotos geprüft». Gleiche Filter ergeben keinen zweiten Eintrag.
 */
export async function saveSearchAction(
  params: unknown,
  locale: unknown,
): Promise<SaveSearchActionResult> {
  if (!isRawParams(params) || !LOCALES.includes(locale as Locale))
    return { ok: false, reason: "generic" };
  const allowed = await guard();
  if ("ok" in allowed) return allowed;
  const query = parseSearchQuery(params);
  const options = await loadFilterOptions(locale as Locale);
  const [source, t] = await Promise.all([
    filterLabelSource(locale as Locale, options),
    getTranslations({ locale: locale as Locale, namespace: "search.saved" }),
  ]);
  const result = await saveSearch(
    allowed.userId,
    query,
    savedSearchName(filterLabels(query, source), t("fallbackName")),
  );
  if (!result.ok)
    return {
      ok: false,
      reason:
        result.reason === "empty" || result.reason === "limit"
          ? result.reason
          : "generic",
    };
  revalidatePath("/[locale]/(shell)/(mitglied)/suchen", "layout");
  return { ok: true, id: result.id };
}

/** Entfernt die gespeicherte Suche wieder (zweiter Klick auf «Suche gespeichert»). */
export async function removeSavedSearchAction(
  id: unknown,
): Promise<SaveSearchActionResult> {
  if (typeof id !== "string") return { ok: false, reason: "generic" };
  const allowed = await guard();
  if ("ok" in allowed) return allowed;
  if (!(await deleteSavedSearch(allowed.userId, id)))
    return { ok: false, reason: "generic" };
  revalidatePath("/[locale]/(shell)/(mitglied)/suchen", "layout");
  return { ok: true, id: null };
}

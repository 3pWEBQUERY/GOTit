"use client";

import {
  activeFilters,
  filtersOnly,
  queryKey,
  toSearchParams,
  type SearchQuery,
} from "@app/core/search/query";
import { FilterBarButton, FilterSheet } from "@app/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { FilterOptions } from "../queries/filter-options";
import { resetQuery, toQueryString } from "../url";
import { SearchFilterFields } from "./search-filter-fields";
import { useSearchState } from "./search-state";

const COUNT_DELAY_MS = 250;

/** Trefferzahl eines Entwurfs von `/api/suche/anzahl`; `null`, solange sie lädt oder nicht verfügbar ist. */
function useDraftCount(
  draft: SearchQuery,
  open: boolean,
  initial: { key: string; total: number },
): number | null {
  const key = queryKey(draft);
  const [counted, setCounted] = useState<{ key: string; total: number | null }>(
    initial,
  );
  useEffect(() => {
    if (!open || key === counted.key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/suche/anzahl${toQueryString(toSearchParams(filtersOnly(draft)))}`,
          { signal: controller.signal },
        );
        const body = response.ok
          ? ((await response.json()) as { total: number })
          : null;
        setCounted({ key, total: body?.total ?? null });
      } catch {
        if (!controller.signal.aborted) setCounted({ key, total: null });
      }
    }, COUNT_DELAY_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft, key, open, counted.key]);
  return counted.key === key ? counted.total : null;
}

/**
 * Filter unter 1024 px: Sheet auf voller Höhe. Die Auswahl wirkt erst über
 * den Button, der die Trefferzahl live nennt (PRD v2 9.2).
 */
export function SearchFilterSheet({
  options,
  total,
}: {
  options: FilterOptions;
  total: number;
}) {
  const t = useTranslations("search.filters");
  const { query, paths, navigate } = useSearchState();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const count = useDraftCount(draft, open, { key: queryKey(query), total });
  // Gezählt wird, was das Sheet einstellt: ohne Freitext und ohne die Voreinstellung der Landingpage.
  const sheetFilters = (entry: SearchQuery) =>
    activeFilters(entry).filter((key) => key !== "q").length;
  const ownFilters =
    sheetFilters(query) - sheetFilters(resetQuery(query, paths.preset));
  // Zurücksetzen im Sheet lässt den Freitext stehen; er wird oberhalb bearbeitet.
  const sheetReset = { ...resetQuery(draft, paths.preset), q: draft.q };

  return (
    <FilterSheet
      title={t("title")}
      closeLabel={t("close")}
      handleLabel={t("handle")}
      resetLabel={t("sheetReset")}
      resetDisabled={queryKey(draft) === queryKey(sheetReset)}
      onReset={() => setDraft(sheetReset)}
      applyLabel={count === null ? t("applyUnknown") : t("apply", { count })}
      onApply={() => navigate(draft)}
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(query);
        setOpen(next);
      }}
      trigger={
        <FilterBarButton count={ownFilters} countSuffix={t("active")}>
          {t("open")}
        </FilterBarButton>
      }
    >
      <SearchFilterFields value={draft} onChange={setDraft} options={options} />
    </FilterSheet>
  );
}

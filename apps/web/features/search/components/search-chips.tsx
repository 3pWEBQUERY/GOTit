"use client";

import { withoutFilter } from "@app/core/search/query";
import { Button, FilterBar, FilterChip } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FilterLabel } from "../filter-labels";
import type { FilterOptions } from "../queries/filter-options";
import { hasOwnFilters } from "../url";
import { SearchFilterSheet } from "./search-filter-sheet";
import { useSearchState } from "./search-state";

function Chips({ chips }: { chips: readonly FilterLabel[] }) {
  const t = useTranslations("search.chips");
  const { query, navigate } = useSearchState();
  return chips.map((chip) => (
    <FilterChip
      key={chip.key}
      variant="removable"
      removeLabel={t("remove", { label: chip.label })}
      onRemove={() => navigate(withoutFilter(query, chip.key))}
    >
      {chip.label}
    </FilterChip>
  ));
}

/**
 * Aktive Filter als entfernbare Chips mit «Alle zurücksetzen» (PRD v2 9.2).
 * Unter 1024 px als haftende Glasleiste mit dem Button «Filter», darüber als Zeile.
 */
export function SearchChips({
  chips,
  options,
  total,
}: {
  chips: readonly FilterLabel[];
  options: FilterOptions;
  total: number;
}) {
  const t = useTranslations("search.chips");
  const { query, paths, reset } = useSearchState();
  const resettable = hasOwnFilters(query, paths.preset);
  return (
    <>
      <FilterBar
        label={t("label")}
        sticky
        leading={<SearchFilterSheet options={options} total={total} />}
        className="top-14 -mx-4 md:top-0 md:-mx-6 lg:hidden"
      >
        <Chips chips={chips} />
        {resettable ? (
          <Button variant="quiet" onClick={reset} className="shrink-0">
            {t("reset")}
          </Button>
        ) : null}
      </FilterBar>
      {chips.length > 0 ? (
        <div
          role="group"
          aria-label={t("label")}
          className="hidden flex-wrap items-center gap-2 lg:flex"
        >
          <Chips chips={chips} />
          {resettable ? (
            <Button variant="quiet" onClick={reset}>
              {t("reset")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

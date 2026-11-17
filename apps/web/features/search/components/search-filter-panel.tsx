"use client";

import { FilterPanel } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FilterOptions } from "../queries/filter-options";
import { hasOwnFilters } from "../url";
import { SearchFilterFields } from "./search-filter-fields";
import { useSearchState } from "./search-state";

/** Filter als Seitenleiste ab 1024 px. Jede Änderung wirkt sofort; der Fokus bleibt im Feld (PRD v2 9.2). */
export function SearchFilterPanel({ options }: { options: FilterOptions }) {
  const t = useTranslations("search.filters");
  const { query, paths, navigate, reset } = useSearchState();
  return (
    <FilterPanel
      title={t("title")}
      resetLabel={t("reset")}
      onReset={reset}
      resetDisabled={!hasOwnFilters(query, paths.preset)}
      className="hidden lg:flex"
    >
      <SearchFilterFields value={query} onChange={navigate} options={options} />
    </FilterPanel>
  );
}

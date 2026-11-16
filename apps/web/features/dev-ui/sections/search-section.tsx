"use client";

import { SearchChipsDemo } from "./search-chips-demo";
import { SearchFiltersDemo } from "./search-filters-demo";
import { SearchResultsDemo } from "./search-results-demo";

/** Testseite der Gruppe «Suche»: jede Komponente in allen Zuständen. Alle Namen und Zahlen sind Beispielwerte. */
export function SearchSection() {
  return (
    <div className="flex flex-col gap-16">
      <SearchChipsDemo />
      <SearchFiltersDemo />
      <SearchResultsDemo />
    </div>
  );
}

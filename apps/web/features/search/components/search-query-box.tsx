"use client";

import { withFilters } from "../url";
import { SearchBox } from "./search-box";
import { useSearchState } from "./search-state";

/** Suchfeld der Suchseite: jede Wahl wirkt sofort auf die aktuelle Suche. */
export function SearchQueryBox() {
  const { query, navigate } = useSearchState();
  return (
    <SearchBox
      text={query.q}
      onChoose={(choice) => {
        if (choice.kind === "text")
          navigate(withFilters(query, { q: choice.text || null }));
        else if (choice.kind === "region")
          navigate(withFilters(query, { region: choice.slug, radiusKm: null }));
        else navigate(withFilters(query, { categories: [choice.slug] }));
      }}
      className="max-w-xl"
    />
  );
}

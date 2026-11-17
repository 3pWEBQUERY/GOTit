"use client";

import type { SearchQuery } from "@app/core/search/query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react";
import { resetQuery, searchUrl, type SearchPaths } from "../url";

interface SearchState {
  /** Die Suche, wie sie gerade gilt; während einer Navigation schon die neue. */
  query: SearchQuery;
  paths: SearchPaths;
  pending: boolean;
  /** Wendet eine Suche an: URL ersetzen, ohne zu scrollen; der Fokus bleibt, wo er ist. */
  navigate: (next: SearchQuery) => void;
  reset: () => void;
  urlFor: (next: SearchQuery) => string;
}

const SearchStateContext = createContext<SearchState | null>(null);

/**
 * Gemeinsamer Zustand von Filtern, Chips, Sortierung und Ansicht. Die URL ist
 * die einzige Quelle; die Seite rendert auf dem Server neu (PRD v2 8.2).
 */
export function SearchStateProvider({
  query,
  paths,
  children,
}: {
  query: SearchQuery;
  paths: SearchPaths;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(query);

  const urlFor = (next: SearchQuery) => searchUrl(paths, next);
  const navigate = (next: SearchQuery) => {
    const url = urlFor(next);
    const leavesPage =
      paths.preset !== null &&
      !url.startsWith(`${paths.preset.path}?`) &&
      url !== paths.preset.path;
    startTransition(() => {
      setOptimistic(next);
      // Wer die Voreinstellung einer Landingpage ändert, wechselt die Seite: dann mit Verlaufseintrag.
      if (leavesPage) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    });
  };
  const value: SearchState = {
    query: optimistic,
    paths,
    pending,
    navigate,
    reset: () => navigate(resetQuery(optimistic, paths.preset)),
    urlFor,
  };
  return (
    <SearchStateContext.Provider value={value}>
      {children}
    </SearchStateContext.Provider>
  );
}

export function useSearchState(): SearchState {
  const state = useContext(SearchStateContext);
  if (!state)
    throw new Error("useSearchState braucht einen SearchStateProvider.");
  return state;
}

/** Markiert die Ergebnisse, solange eine neue Suche lädt. */
export function SearchPending({ children }: { children: ReactNode }) {
  const { pending } = useSearchState();
  return (
    <div
      aria-busy={pending || undefined}
      data-search-pending={pending || undefined}
      className={
        pending
          ? "opacity-60 transition-opacity duration-state"
          : "transition-opacity duration-state"
      }
    >
      {children}
    </div>
  );
}

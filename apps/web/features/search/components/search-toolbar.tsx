"use client";

import {
  SEARCH_SORTS,
  activeFilters,
  queryKey,
  toSearchParams,
  type SearchSort,
} from "@app/core/search/query";
import {
  Button,
  SavedSearchButton,
  SortMenu,
  UiLink,
  ViewToggle,
  useToast,
  type SavedSearchState,
} from "@app/ui";
import { Bookmark } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  removeSavedSearchAction,
  saveSearchAction,
} from "../actions/save-search";
import { useSearchState } from "./search-state";

export interface SearchToolbarProps {
  savedId: string | null;
  /** Für Besucher: Anmeldung mit Rückweg; angemeldet: null. */
  signInHref: string | null;
}

/** Sortierung, Ansicht und «Suche speichern» (PRD v2 9.2). Keine Sortierung nach Beliebtheit. */
export function SearchToolbar({ savedId, signInHref }: SearchToolbarProps) {
  const t = useTranslations("search");
  const { query, navigate } = useSearchState();
  const sortOptions = SEARCH_SORTS.map((value) => ({
    value,
    label: t(`sort.${value}`),
  }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <SortMenu
        label={t("toolbar.sort")}
        options={sortOptions}
        value={query.sort}
        onValueChange={(sort: SearchSort) =>
          navigate({ ...query, sort, page: 1 })
        }
        className="-ml-4"
      />
      <div className="flex flex-wrap items-center gap-3">
        {activeFilters(query).length > 0 ? (
          <SaveSearch
            key={queryKey(query)}
            savedId={savedId}
            signInHref={signInHref}
          />
        ) : null}
        <ViewToggle
          label={t("toolbar.view")}
          labels={{ grid: t("toolbar.grid"), list: t("toolbar.list") }}
          value={query.view === "liste" ? "list" : "grid"}
          onValueChange={(view) =>
            navigate({ ...query, view: view === "list" ? "liste" : "raster" })
          }
        />
      </div>
    </div>
  );
}

function SaveSearch({ savedId, signInHref }: SearchToolbarProps) {
  const t = useTranslations("search.saved");
  const locale = useLocale();
  const { toast } = useToast();
  const { query } = useSearchState();
  const [id, setId] = useState(savedId);
  const [shownFor, setShownFor] = useState(savedId);
  const [pending, startTransition] = useTransition();
  // Neue Filter, neuer Zustand: der Server meldet, ob diese Kombination gespeichert ist.
  if (shownFor !== savedId) {
    setShownFor(savedId);
    setId(savedId);
  }

  if (signInHref)
    return (
      <Button asChild>
        <UiLink href={signInHref}>
          <Bookmark aria-hidden strokeWidth={1.5} className="size-5" />
          {t("idle")}
        </UiLink>
      </Button>
    );

  const state: SavedSearchState = pending ? "saving" : id ? "saved" : "idle";
  const onClick = () =>
    startTransition(async () => {
      const result = id
        ? await removeSavedSearchAction(id)
        : await saveSearchAction(toSearchParams(query), locale);
      if (result.ok) {
        setId(result.id);
        toast({
          title: result.id ? t("added") : t("removed"),
          tone: "success",
        });
      } else toast({ title: t(`errors.${result.reason}`), tone: "error" });
    });
  return (
    <SavedSearchButton
      state={state}
      labels={{ idle: t("idle"), saving: t("saving"), saved: t("saved") }}
      onClick={onClick}
    />
  );
}

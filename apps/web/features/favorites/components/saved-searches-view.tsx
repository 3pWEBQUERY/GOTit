import type { Locale } from "@app/core/locale";
import { SAVED_SEARCH_NAME_MAX } from "@app/core/search";
import { EmptyState, UiLink, buttonVariants } from "@app/ui";
import { BookmarkPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "../../account/require-account";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { loadSavedSearches } from "../queries/load-saved-searches";
import { SavedSearchList } from "./saved-search-list";

/** `/suchen` (PRD v2 7.5, v1 FR-SEARCH-005): gespeicherte Filterkombinationen, neueste oben. Kein Suchverlauf (Entscheid 0013). */
export async function SavedSearchesView({ locale }: { locale: Locale }) {
  const viewer = await requireAccount(locale);
  const [t, { items, max }] = await Promise.all([
    getTranslations({ locale, namespace: "favorites.searches" }),
    loadSavedSearches(viewer.userId, locale),
  ]);
  const href = createHref(locale);
  return (
    <div className="flex max-w-reading flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body text-ink-muted">{t("intro")}</p>
        {items.length > 0 ? (
          <p className="tabular text-small text-ink-muted">
            {t("count", { count: items.length, max })}
          </p>
        ) : null}
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon={<BookmarkPlus strokeWidth={1.5} />}
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={
            <UiLink
              href={href("/suche")}
              className={buttonVariants({ variant: "primary" })}
            >
              {t("emptyAction")}
            </UiLink>
          }
          className="py-4"
        />
      ) : (
        <SavedSearchList items={items} nameMax={SAVED_SEARCH_NAME_MAX} />
      )}
    </div>
  );
}

import type { Locale } from "@app/core/locale";
import type { RawParams } from "@app/core/search/query";
import { Breadcrumbs, ErrorState, ResultCount, type Crumb } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { loadSearchPage } from "../queries/load-search";
import type { SearchPreset } from "../url";
import { SearchChips } from "./search-chips";
import { SearchEmpty } from "./search-empty";
import { SearchFilterPanel } from "./search-filter-panel";
import { SearchQueryBox } from "./search-query-box";
import { SearchResults } from "./search-results";
import { ReloadButton } from "./search-status";
import { SearchPending, SearchStateProvider } from "./search-state";
import { SearchToolbar } from "./search-toolbar";

export interface SearchViewProps {
  locale: Locale;
  searchParams: RawParams;
  /** Landingpage: feste Voreinstellung, eigene Überschrift und Breadcrumbs. `/suche`: null. */
  landing: {
    preset: SearchPreset;
    title: string;
    breadcrumbs: readonly Crumb[];
  } | null;
  /** Zusätzlicher Inhalt unter den Ergebnissen, zum Beispiel die Städte eines Kantons. */
  footer?: ReactNode;
}

/**
 * Gemeinsame Suchansicht von `/suche`, `/profile` und den Landingpages
 * (PRD v2 9.2). Server-gerendert aus der URL; Filter, Chips, Sortierung und
 * Ansicht ändern nur die URL.
 */
export async function SearchView({
  locale,
  searchParams,
  landing,
  footer,
}: SearchViewProps) {
  const [data, t] = await Promise.all([
    loadSearchPage(locale, searchParams, landing?.preset ?? null),
    getTranslations({ locale, namespace: "search" }),
  ]);
  if (data.state === "rate-limited")
    return (
      <div className="flex max-w-prose flex-col gap-6">
        <h1 className="text-h1">
          {landing?.title ?? t("state.rateLimitedTitle")}
        </h1>
        <ErrorState
          title={t("state.rateLimitedTitle")}
          description={t("state.rateLimitedDescription", {
            seconds: data.retryAfterSeconds,
          })}
          action={<ReloadButton label={t("state.reload")} />}
        />
      </div>
    );

  const { query, result, paths, options, chips } = data;
  const count = data.regionName
    ? t("title.countIn", { count: result.total, region: data.regionName })
    : t("title.count", { count: result.total });
  const title = landing?.title ?? count;

  return (
    <SearchStateProvider query={query} paths={paths}>
      <TopBarTitle title={title} />
      <div className="flex flex-col gap-4">
        {landing ? (
          <Breadcrumbs label={t("breadcrumbs")} items={landing.breadcrumbs} />
        ) : null}
        {landing ? (
          <>
            <h1 className="text-h1">{landing.title}</h1>
            <ResultCount>{count}</ResultCount>
          </>
        ) : (
          <ResultCount as="h1">{count}</ResultCount>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-6 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SearchFilterPanel options={options} />
        <div className="flex min-w-0 flex-col gap-4">
          <SearchQueryBox />
          <SearchChips chips={chips} options={options} total={result.total} />
          <SearchToolbar savedId={data.savedId} signInHref={data.signInHref} />
          <SearchPending>
            {result.total === 0 ? (
              <SearchEmpty
                locale={locale}
                query={query}
                paths={paths}
                chips={chips}
                mostRestrictive={result.mostRestrictive}
              />
            ) : (
              <SearchResults
                locale={locale}
                hits={result.hits}
                total={result.total}
                hasMore={result.hasMore}
                query={query}
                paths={paths}
                favorites={new Set(data.favorites)}
                signInHref={data.signInHref}
              />
            )}
          </SearchPending>
          {footer}
        </div>
      </div>
    </SearchStateProvider>
  );
}

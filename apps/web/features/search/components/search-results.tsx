import type { Locale } from "@app/core/locale";
import type { SearchHit } from "@app/core/search";
import { PAGE_SIZE, type SearchQuery } from "@app/core/search/query";
import { buttonVariants, cn } from "@app/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createHref } from "../../shell/nav/href";
import { searchUrl, type SearchPaths } from "../url";
import { SearchHitCard } from "./search-hit-card";

export interface SearchResultsProps {
  locale: Locale;
  hits: readonly SearchHit[];
  total: number;
  hasMore: boolean;
  query: SearchQuery;
  paths: SearchPaths;
  favorites: ReadonlySet<string>;
  signInHref: string | null;
}

/** Profile als Raster oder Liste, 24 pro Seite, mit «Weitere 24 laden» als echtem Link (PRD v2 9.2). */
export async function SearchResults({
  locale,
  hits,
  total,
  hasMore,
  query,
  paths,
  favorites,
  signInHref,
}: SearchResultsProps) {
  const t = await getTranslations({ locale, namespace: "search.results" });
  const href = createHref(locale);
  const list = query.view === "liste";
  const number = new Intl.NumberFormat(
    locale === "de" ? "de-CH" : `${locale}-CH`,
  );
  const next = Math.min(PAGE_SIZE, total - hits.length);
  return (
    <section aria-labelledby="search-results" className="flex flex-col gap-6">
      <h2 id="search-results" className="sr-only">
        {t("heading")}
      </h2>
      <ul
        data-search-results={list ? "list" : "grid"}
        className={
          list
            ? "flex flex-col divide-y divide-border"
            : "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4"
        }
      >
        {hits.map((hit, index) => (
          <li key={hit.slug} className={list ? "py-4 first:pt-0" : undefined}>
            <SearchHitCard
              hit={hit}
              href={href({ pathname: "/p/[name]", params: { name: hit.slug } })}
              variant={list ? "list" : "grid"}
              favorite={favorites.has(hit.slug)}
              signInHref={signInHref}
              priority={index < (list ? 2 : 4)}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-3 border-t border-border pt-6">
        <p className="tabular text-small text-ink-muted">
          {t("range", {
            from: number.format(hits.length > 0 ? 1 : 0),
            to: number.format(hits.length),
            total: number.format(total),
          })}
        </p>
        {hasMore ? (
          <Link
            href={searchUrl(paths, { ...query, page: query.page + 1 })}
            scroll={false}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            {t("more", { count: next })}
          </Link>
        ) : hits.length < total ? (
          <p className="max-w-prose text-center text-small text-ink-muted">
            {t("limit", { count: number.format(hits.length) })}
          </p>
        ) : null}
      </div>
    </section>
  );
}

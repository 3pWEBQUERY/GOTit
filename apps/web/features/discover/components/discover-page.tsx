import { favoriteSlugs } from "@app/core/favorites";
import type { Viewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { searchPort } from "@app/core/search";
import { EMPTY_QUERY, type SearchQuery } from "@app/core/search/query";
import { getTranslations } from "next-intl/server";
import { loadFilterOptions } from "../../search/queries/filter-options";
import { searchUrl, type SearchPaths } from "../../search/url";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { getViewer } from "../../shell/queries/get-viewer";
import { currentRegion, type DiscoverRegion } from "../queries/current-region";
import { DiscoverEmpty } from "./discover-empty";
import {
  DiscoverQuickLinks,
  DiscoverRegionLinks,
  DiscoverRowSection,
  type DiscoverRow,
} from "./discover-rows";
import { DiscoverSearch } from "./discover-search";
import { RegionMenu } from "./region-menu";

/** Höchstens so viele Profile pro Reihe. */
const ROW_SIZE = 10;

type Translate = Awaited<ReturnType<typeof getTranslations<"discover">>>;

/** Reihen der Region: Relevanz und «Neu dabei»; eine Reihe ohne Einträge entfällt. */
async function loadRows(
  region: DiscoverRegion,
  context: { viewer: Viewer; locale: Locale },
  paths: SearchPaths,
  t: Translate,
) {
  const { viewer } = context;
  const base: SearchQuery = { ...EMPTY_QUERY, region: region.slug };
  const newQuery: SearchQuery = { ...base, newOnly: true, sort: "neu" };
  const [top, fresh] = await Promise.all([
    searchPort.search(base, context),
    searchPort.search(newQuery, context),
  ]);
  const rows: DiscoverRow[] = [
    {
      id: "in-region",
      title: t("rows.inRegion", { region: region.name }),
      hits: top.hits.slice(0, ROW_SIZE),
      more:
        top.total > ROW_SIZE
          ? {
              label: t("rows.allIn", { region: region.name }),
              href: searchUrl(paths, base),
            }
          : null,
    },
    {
      id: "new",
      title: t("rows.new"),
      hits: fresh.hits.slice(0, ROW_SIZE),
      more:
        fresh.total > ROW_SIZE
          ? { label: t("rows.allNew"), href: searchUrl(paths, newQuery) }
          : null,
    },
  ].filter((row) => row.hits.length > 0);
  const hearted = await favoriteSlugs(
    viewer,
    rows.flatMap((row) => row.hits.map((hit) => hit.slug)),
  );
  return { base, rows, hearted };
}

/**
 * Entdecken (PRD v2 9.1): Suchfeld, Region und echte Profile, keine
 * Marketingfläche. Eine Reihe ohne Einträge entfällt; Reihen für Verfügbarkeit,
 * Touren, Clubs und Community kommen mit ihren Schritten.
 */
export async function DiscoverPage({ locale }: { locale: Locale }) {
  const [t, { region, featured }, viewer, options] = await Promise.all([
    getTranslations({ locale, namespace: "discover" }),
    currentRegion(locale),
    getViewer(),
    loadFilterOptions(locale),
  ]);
  const href = createHref(locale);
  const paths: SearchPaths = { search: href("/suche"), preset: null };
  const regionHref = (entry: DiscoverRegion) =>
    entry.kind === "CITY" && entry.cantonSlug
      ? href({
          pathname: "/ch/[kanton]/[stadt]",
          params: { kanton: entry.cantonSlug, stadt: entry.slug },
        })
      : href({ pathname: "/ch/[kanton]", params: { kanton: entry.slug } });
  const others = featured
    .filter((entry) => entry.slug !== region?.slug)
    .map((entry) => ({ ...entry, href: regionHref(entry) }));
  const title = region
    ? t("title", { region: region.name })
    : t("titleNoRegion");

  if (!region)
    return (
      <div className="flex flex-col gap-6">
        <TopBarTitle title={title} />
        <h1 className="text-h1">{title}</h1>
        <DiscoverEmpty
          title={t("noRegions.title")}
          description={t("noRegions.description")}
          action={{ label: t("noRegions.action"), href: href("/sicherheit") }}
          otherRegionsLabel={t("empty.otherRegions")}
          otherRegions={[]}
        />
      </div>
    );

  const { base, rows, hearted } = await loadRows(
    region,
    { viewer, locale },
    paths,
    t,
  );
  const signInHref =
    viewer.kind === "account"
      ? null
      : href({ pathname: "/anmelden", query: { weiter: href("/") } });

  return (
    <div className="flex flex-col gap-8">
      <TopBarTitle title={title} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h1">{title}</h1>
          <RegionMenu
            current={region.slug}
            regions={featured.map((entry) => ({
              slug: entry.slug,
              name: entry.name,
            }))}
            allRegionsHref={href("/ch")}
          />
        </div>
        <DiscoverSearch
          searchPath={paths.search}
          categories={options.categories}
        />
        <DiscoverQuickLinks
          label={t("quick.label")}
          links={[
            {
              label: t("quick.photos"),
              href: searchUrl(paths, { ...base, photos: true }),
            },
            {
              label: t("quick.newOnly"),
              href: searchUrl(paths, { ...base, newOnly: true }),
            },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <DiscoverEmpty
          title={t("empty.title", { region: region.name })}
          description={t("empty.description")}
          otherRegionsLabel={t("empty.otherRegions")}
          otherRegions={others}
        />
      ) : (
        rows.map((row) => (
          <DiscoverRowSection
            key={row.id}
            row={row}
            profileHref={(slug) =>
              href({ pathname: "/p/[name]", params: { name: slug } })
            }
            hearted={hearted}
            signInHref={signInHref}
          />
        ))
      )}
      {rows.length > 0 ? (
        <DiscoverRegionLinks
          title={t("regions")}
          links={[
            ...featured.map((entry) => ({
              key: entry.slug,
              label: entry.name,
              href: regionHref(entry),
            })),
            { key: "alle", label: t("region.all"), href: href("/ch") },
          ]}
        />
      ) : null}
    </div>
  );
}

import type { Locale } from "@app/core/locale";
import { listPublicOrganizations } from "@app/core/organization";
import { Breadcrumbs, EmptyState, UiLink, buttonVariants } from "@app/ui";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listDiscoverRegions } from "../../discover/queries/current-region";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { parseClubFilters } from "../lib/filters";
import { ClubListCard } from "./club-list-card";
import { ClubsFilters } from "./clubs-filters";

/**
 * `/clubs` (v2 7.1): veröffentlichte Clubs und Agenturen mit Filtern Art und
 * Region in der URL. Der Suchindex kennt heute nur Anbieter; die Liste kommt
 * direkt aus dem Kern (Entscheid 0018). «Keine Treffer» unterscheidet sich
 * von «noch nichts veröffentlicht» (v2 13).
 */
export async function ClubsListPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [t, regions] = await Promise.all([
    getTranslations({ locale, namespace: "clubs" }),
    listDiscoverRegions(locale),
  ]);
  const filters = parseClubFilters(
    searchParams,
    regions.map((region) => region.slug),
  );
  const entries = await listPublicOrganizations(locale, {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.region ? { regionSlug: filters.region } : {}),
  });
  const href = createHref(locale);
  const base = href("/clubs");
  const filtered = Boolean(filters.kind || filters.region);
  const regionName = regions.find(
    (region) => region.slug === filters.region,
  )?.name;
  const empty = filtered
    ? {
        title: t("list.noMatches"),
        description: t("list.noMatchesHint"),
        action: { label: t("list.reset"), href: base },
      }
    : {
        title: t("list.empty"),
        description: t("list.emptyHint"),
        action: { label: t("list.toSearch"), href: href("/suche") },
      };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={t("list.title")} />
      <Breadcrumbs
        label={t("page.breadcrumbs")}
        items={[
          { label: t("page.discover"), href: href("/") },
          { label: t("page.clubs") },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">
          {regionName
            ? t("list.titleIn", { region: regionName })
            : t("list.title")}
        </h1>
        <p className="max-w-prose text-body text-ink-muted">
          {t("list.intro")}
        </p>
      </div>
      <ClubsFilters base={base} filters={filters} regions={regions} />
      <p role="status" className="text-body text-ink-muted">
        {t("list.count", { count: entries.length })}
      </p>
      {entries.length === 0 ? (
        <EmptyState
          icon={<Building2 strokeWidth={1.5} />}
          title={empty.title}
          description={empty.description}
          action={
            <UiLink
              href={empty.action.href}
              className={buttonVariants({ variant: "secondary" })}
            >
              {empty.action.label}
            </UiLink>
          }
        />
      ) : (
        <ul data-club-list className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <ClubListCard
                entry={entry}
                href={href({
                  pathname: "/c/[slug]",
                  params: { slug: entry.slug },
                })}
                headingLevel={2}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

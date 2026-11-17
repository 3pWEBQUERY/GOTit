import type { Locale } from "@app/core/locale";
import { listPublicOrganizations } from "@app/core/organization";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { REGION_PARAM } from "../lib/filters";
import { ClubListCard } from "./club-list-card";
import { linkClass } from "./club-locations";

/** Höchstens so viele Clubs und Agenturen in der Reihe. */
const ROW_SIZE = 6;

/** Reihe «Clubs in der Nähe» auf Entdecken (v2 9.1): kompakte Liste in zwei Spalten; ohne Einträge entfällt sie. */
export async function DiscoverClubs({
  locale,
  region,
}: {
  locale: Locale;
  region: { slug: string; name: string };
}) {
  const [t, entries] = await Promise.all([
    getTranslations({ locale, namespace: "clubs.discover" }),
    listPublicOrganizations(locale, { regionSlug: region.slug }),
  ]);
  if (entries.length === 0) return null;
  const href = createHref(locale);
  return (
    <section aria-labelledby="row-clubs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="row-clubs" className="text-h2">
          {t("title")}
        </h2>
        {entries.length > ROW_SIZE ? (
          <UiLink
            href={`${href("/clubs")}?${new URLSearchParams({ [REGION_PARAM]: region.slug })}`}
            className={linkClass}
          >
            {t("all", { region: region.name })}
          </UiLink>
        ) : null}
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {entries.slice(0, ROW_SIZE).map((entry) => (
          <li key={entry.slug}>
            <ClubListCard
              entry={entry}
              href={href({
                pathname: "/c/[slug]",
                params: { slug: entry.slug },
              })}
              headingLevel={3}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

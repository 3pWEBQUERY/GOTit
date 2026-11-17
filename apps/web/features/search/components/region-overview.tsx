import type { Locale } from "@app/core/locale";
import { listRegionLanding } from "@app/core/search";
import { Breadcrumbs, EmptyState, UiLink } from "@app/ui";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";

const linkClass =
  "inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent";

/** `/ch`: freigegebene Kantone mit ihren Städten als Linkliste, kein Bildraster (PRD v2 9.1). */
export async function RegionOverview({ locale }: { locale: Locale }) {
  const [cantons, t] = await Promise.all([
    listRegionLanding(locale),
    getTranslations({ locale, namespace: "search" }),
  ]);
  const href = createHref(locale);
  const title = t("overview.title");
  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={title} />
      <Breadcrumbs
        label={t("breadcrumbs")}
        items={[{ label: t("discover"), href: href("/") }, { label: title }]}
      />
      <div className="flex max-w-prose flex-col gap-2">
        <h1 className="text-h1">{title}</h1>
        <p className="text-body text-ink-muted">{t("overview.intro")}</p>
      </div>
      {cantons.length === 0 ? (
        <EmptyState
          icon={<MapPin strokeWidth={1.5} />}
          title={t("overview.emptyTitle")}
          description={t("overview.emptyDescription")}
        />
      ) : (
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {cantons.map((canton) => (
            <li key={canton.slug} className="flex flex-col gap-1">
              <h2 className="text-h3">
                <UiLink
                  href={href({
                    pathname: "/ch/[kanton]",
                    params: { kanton: canton.slug },
                  })}
                  className={linkClass}
                >
                  {t("canton", { name: canton.name })}
                </UiLink>
              </h2>
              {canton.cities.length > 0 ? (
                <ul className="flex flex-wrap gap-x-4">
                  {canton.cities.map((city) => (
                    <li key={city.slug}>
                      <UiLink
                        href={href({
                          pathname: "/ch/[kanton]/[stadt]",
                          params: { kanton: canton.slug, stadt: city.slug },
                        })}
                        className={linkClass}
                      >
                        {city.name}
                      </UiLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Unter den Ergebnissen eines Kantons: seine freigegebenen Städte. */
export async function CantonCities({
  locale,
  canton,
}: {
  locale: Locale;
  canton: string;
}) {
  const [cantons, t] = await Promise.all([
    listRegionLanding(locale),
    getTranslations({ locale, namespace: "search" }),
  ]);
  const entry = cantons.find((candidate) => candidate.slug === canton);
  if (!entry || entry.cities.length === 0) return null;
  const href = createHref(locale);
  return (
    <nav
      aria-labelledby="canton-cities"
      className="border-t border-border pt-6"
    >
      <h2 id="canton-cities" className="mb-2 text-h2">
        {t("landing.cities", { name: entry.name })}
      </h2>
      <ul className="flex flex-wrap gap-x-4">
        {entry.cities.map((city) => (
          <li key={city.slug}>
            <UiLink
              href={href({
                pathname: "/ch/[kanton]/[stadt]",
                params: { kanton: entry.slug, stadt: city.slug },
              })}
              className={linkClass}
            >
              {city.name}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

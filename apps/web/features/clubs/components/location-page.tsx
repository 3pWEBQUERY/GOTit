import { favoriteSlugs } from "@app/core/favorites";
import type { Locale } from "@app/core/locale";
import { Breadcrumbs, EmptyState, UiLink } from "@app/ui";
import { UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { getViewer } from "../../shell/queries/get-viewer";
import { locationPlace, providersAt } from "../model";
import { loadPublicOrganization } from "../queries/load-organization";
import { linkClass } from "./club-locations";
import { ClubProviderGrid } from "./club-provider-grid";
import { LocationDetails } from "./location-details";

/**
 * Standort `/c/[slug]/standorte/[id]` (v2 7.1): Ort so allgemein wie
 * angegeben, Öffnungszeiten mit Stand für heute, abweichende Tage, Kontakt
 * und die Anbieter, deren Verknüpfung für diesen Standort gilt.
 */
export async function LocationPage({
  locale,
  slug,
  id,
}: {
  locale: Locale;
  slug: string;
  id: string;
}) {
  const organization = await loadPublicOrganization(slug, locale);
  const location = organization?.locations.find((entry) => entry.id === id);
  if (!organization || !location) notFound();
  const [t, viewer] = await Promise.all([
    getTranslations({ locale, namespace: "clubs" }),
    getViewer(),
  ]);
  const href = createHref(locale);
  const clubHref = href({
    pathname: "/c/[slug]",
    params: { slug: organization.slug },
  });
  const here = href({
    pathname: "/c/[slug]/standorte/[id]",
    params: { slug: organization.slug, id: location.id },
  });
  const providers = providersAt(organization, location.id);
  const hearted = await favoriteSlugs(
    viewer,
    providers.map((provider) => provider.slug),
  );
  const signInHref =
    viewer.kind === "account"
      ? null
      : href({ pathname: "/anmelden", query: { weiter: here } });
  const place = locationPlace(location);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <TopBarTitle title={location.name} />
      <Breadcrumbs
        label={t("page.breadcrumbs")}
        items={[
          { label: t("page.discover"), href: href("/") },
          { label: t("page.clubs"), href: href("/clubs") },
          { label: organization.name, href: clubHref },
          { label: location.name },
        ]}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 break-words">{location.name}</h1>
        <p className="text-body text-ink-muted">
          {t("location.of", {
            kind: t(`kind.${organization.kind}`),
            name: organization.name,
          })}
          {place ? ` · ${place}` : null}
        </p>
        <UiLink href={clubHref} className={linkClass}>
          {t("location.back", { name: organization.name })}
        </UiLink>
      </header>
      <LocationDetails organization={organization} location={location} />
      <section
        aria-labelledby="standort-anbieter"
        className="flex flex-col gap-4"
      >
        <h2 id="standort-anbieter" className="text-h2">
          {t("location.providers")}
        </h2>
        {providers.length === 0 ? (
          <EmptyState
            icon={<UsersRound strokeWidth={1.5} />}
            title={t("location.noProviders")}
            action={
              <UiLink
                href={href({
                  pathname: "/c/[slug]/team",
                  params: { slug: organization.slug },
                })}
                className={linkClass}
              >
                {t("location.allProviders", { name: organization.name })}
              </UiLink>
            }
          />
        ) : (
          <ClubProviderGrid
            providers={providers}
            profileHref={(name) =>
              href({ pathname: "/p/[name]", params: { name } })
            }
            hearted={hearted}
            signInHref={signInHref}
            headingLevel={3}
          />
        )}
      </section>
    </div>
  );
}

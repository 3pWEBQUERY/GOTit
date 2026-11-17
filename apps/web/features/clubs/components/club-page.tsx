import { favoriteSlugs } from "@app/core/favorites";
import type { Locale } from "@app/core/locale";
import { Breadcrumbs } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LAYOUT } from "../../profile/components/view/layout-classes";
import { ProfileGallery } from "../../profile/components/view/profile-gallery";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { getViewer } from "../../shell/queries/get-viewer";
import { OVERVIEW_PROVIDERS, galleryMedia, type ClubProvider } from "../model";
import { loadPublicOrganization } from "../queries/load-organization";
import {
  ClubContact,
  ClubHeader,
  ClubTabs,
  ClubTrust,
  type ClubTab,
} from "./club-header";
import { ClubProviderGrid } from "./club-provider-grid";
import { ClubOverview, ProvidersEmpty, Section } from "./club-sections";

/**
 * Club- oder Agenturprofil `/c/[slug]` und `/c/[slug]/team` (v2 9.4): gleicher
 * Aufbau wie das Anbieterprofil (v2 10) mit Über uns, Standorten mit
 * Öffnungszeiten, verknüpften Anbietern, Galerie und Kontakt. Verknüpfte
 * Anbieter liefert der Kern erst nach ihrer Zustimmung und nur mit
 * öffentlichen Angaben.
 */
export async function ClubPage({
  locale,
  slug,
  tab,
}: {
  locale: Locale;
  slug: string;
  tab: ClubTab;
}) {
  const organization = await loadPublicOrganization(slug, locale);
  if (!organization) notFound();
  const [t, viewer] = await Promise.all([
    getTranslations({ locale, namespace: "clubs" }),
    getViewer(),
  ]);
  const href = createHref(locale);
  const params = { slug: organization.slug };
  const links = {
    overview: href({ pathname: "/c/[slug]", params }),
    team: href({ pathname: "/c/[slug]/team", params }),
  };
  const { providers } = organization;
  const hearted = await favoriteSlugs(
    viewer,
    providers.map((provider) => provider.slug),
  );
  const signInHref =
    viewer.kind === "account"
      ? null
      : href({ pathname: "/anmelden", query: { weiter: links[tab] } });
  const grid = (list: ClubProvider[]) =>
    list.length === 0 ? (
      <ProvidersEmpty searchHref={href("/suche")} />
    ) : (
      <ClubProviderGrid
        providers={list}
        profileHref={(name) =>
          href({ pathname: "/p/[name]", params: { name } })
        }
        hearted={hearted}
        signInHref={signInHref}
        headingLevel={3}
      />
    );
  const media = galleryMedia(organization);
  const classes = LAYOUT.responsive;

  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={organization.name} />
      <Breadcrumbs
        label={t("page.breadcrumbs")}
        items={[
          { label: t("page.discover"), href: href("/") },
          { label: t("page.clubs"), href: href("/clubs") },
          ...(tab === "team"
            ? [
                { label: organization.name, href: links.overview },
                { label: t("tabs.team") },
              ]
            : [{ label: organization.name }]),
        ]}
      />
      <article data-club-view className={classes.root}>
        <div className={classes.gallery}>
          <ProfileGallery
            name={organization.name}
            media={media.slice(0, 1)}
            layout="responsive"
          />
        </div>
        <div className={classes.aside}>
          <div className={classes.asideInner}>
            <ClubHeader organization={organization} />
            <ClubTrust verifiedAt={organization.verifiedAt} />
            <ClubContact
              organization={organization}
              reportHref={href("/melden")}
              id="club-kontakt"
            />
          </div>
        </div>
        <div className={classes.main}>
          <ClubTabs
            current={tab}
            links={links}
            providerCount={providers.length}
          />
          {tab === "team" ? (
            <Section
              id="club-team"
              title={t("team.title", { name: organization.name })}
            >
              <p className="max-w-prose text-body text-ink-muted">
                {t("team.intro")}
              </p>
              {grid(providers)}
            </Section>
          ) : (
            <ClubOverview
              organization={organization}
              gallery={media.slice(1)}
              providers={grid(providers.slice(0, OVERVIEW_PROVIDERS))}
              teamHref={links.team}
              locationHref={(id) =>
                href({
                  pathname: "/c/[slug]/standorte/[id]",
                  params: { ...params, id },
                })
              }
            />
          )}
        </div>
      </article>
    </div>
  );
}

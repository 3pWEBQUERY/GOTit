import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createHref } from "../shell/nav/href";
import { loadPublicOrganization } from "./queries/load-organization";

const NOINDEX = { index: false, follow: false } as const;

/**
 * Metadaten der Clubseiten (v2 10.1 sinngemäss): Canonical auf die eigene
 * Seite, `noindex` für den Tab «Anbieter». Nur öffentliche Angaben.
 */
export async function clubMetadata(
  locale: Locale,
  slug: string,
  view: { tab: "overview" | "team" } | { locationId: string },
): Promise<Metadata> {
  const [organization, t] = await Promise.all([
    loadPublicOrganization(slug, locale),
    getTranslations({ locale, namespace: "clubs" }),
  ]);
  if (!organization) return { title: t("meta.notFound"), robots: NOINDEX };
  const href = createHref(locale);
  const params = { slug: organization.slug };
  const kind = t(`kind.${organization.kind}`);
  if ("locationId" in view) {
    const location = organization.locations.find(
      (entry) => entry.id === view.locationId,
    );
    if (!location) return { title: t("meta.notFound"), robots: NOINDEX };
    return {
      title: t("meta.locationTitle", {
        location: location.name,
        name: organization.name,
      }),
      description: t("meta.locationDescription", {
        location: location.name,
        name: organization.name,
      }),
      alternates: {
        canonical: href({
          pathname: "/c/[slug]/standorte/[id]",
          params: { ...params, id: location.id },
        }),
      },
    };
  }
  if (view.tab === "team")
    return {
      title: t("meta.teamTitle", { name: organization.name }),
      alternates: { canonical: href({ pathname: "/c/[slug]/team", params }) },
      robots: NOINDEX,
    };
  const regions = [
    ...new Set(
      organization.locations.flatMap((location) =>
        location.regionName ? [location.regionName] : [],
      ),
    ),
  ].join(", ");
  return {
    title: organization.name,
    description: regions
      ? t("meta.description", { name: organization.name, kind, regions })
      : t("meta.descriptionNoRegion", { name: organization.name, kind }),
    alternates: { canonical: href({ pathname: "/c/[slug]", params }) },
  };
}

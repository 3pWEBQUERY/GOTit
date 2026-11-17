import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscoverEmpty } from "@/features/discover/components/discover-empty";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";
import { getShellData } from "@/features/shell/queries/get-shell-data";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "discover" });
  return { title: t("metaTitle") };
}

/** Entdecken. Bis Schritt 1.7 die Suche liefert, zeigt die Seite den ehrlichen Leerzustand der Region. */
export default async function DiscoverPage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, { regions }] = await Promise.all([getTranslations({ locale, namespace: "discover" }), getShellData(locale)]);
  const href = createHref(locale);
  const [region, ...others] = regions;
  const title = region ? t("title", { region: region.name }) : t("titleNoRegion");
  const regionHref = (kanton: string | null, slug: string) =>
    kanton ? href({ pathname: "/ch/[kanton]/[stadt]", params: { kanton, stadt: slug } }) : href({ pathname: "/ch/[kanton]", params: { kanton: slug } });

  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={title} />
      <h1 className="text-h1">{title}</h1>
      <DiscoverEmpty
        title={region ? t("empty.title", { region: region.name }) : t("noRegions.title")}
        description={region ? t("empty.description") : t("noRegions.description")}
        action={region ? undefined : { label: t("noRegions.action"), href: href("/sicherheit") }}
        otherRegionsLabel={t("empty.otherRegions")}
        otherRegions={others.map((other) => ({ ...other, href: regionHref(other.cantonSlug, other.slug) }))}
      />
    </div>
  );
}

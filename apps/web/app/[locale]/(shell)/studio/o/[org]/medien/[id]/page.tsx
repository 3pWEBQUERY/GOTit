import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MediaDetail } from "@/features/media/detail/media-detail";
import { getViewerOrganizationMedia } from "@/features/media/queries/get-own-media";
import { toLibraryItem } from "@/features/media/queries/load-library";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/medien/[id]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "media.meta" });
  return { title: t("detail") };
}

/** Detail eines Mediums der Organisation: Alternativtext, Logo, Titelbild, Löschen (Entscheid 0018). */
export default async function OrganizationMediaDetailPage({ params }: PageProps<"/[locale]/studio/o/[org]/medien/[id]">) {
  const { locale: rawLocale, org, id } = await params;
  const locale = rawLocale as Locale;
  const media = await getViewerOrganizationMedia(org, id);
  if (!media || media.status === "FAILED") notFound();
  const t = await getTranslations({ locale, namespace: "media.detail" });
  return (
    <>
      <TopBarTitle title={t("title")} />
      <MediaDetail locale={locale} item={toLibraryItem(media, null)} scope={{ kind: "organization", org }} />
    </>
  );
}

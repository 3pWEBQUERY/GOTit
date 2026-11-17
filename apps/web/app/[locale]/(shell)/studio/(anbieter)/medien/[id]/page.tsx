import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MediaDetail } from "@/features/media/detail/media-detail";
import { toLibraryItem } from "@/features/media/queries/load-library";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { getViewerMedia } from "@/features/media/queries/get-own-media";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "media.meta" });
  return { title: t("detail") };
}

/** Detail `/studio/medien/[id]`. Fremde, gelöschte und unbekannte IDs ergeben dieselbe 404. */
export default async function MediaDetailPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const media = await getViewerMedia(id);
  if (!media || media.status === "FAILED") notFound();
  const t = await getTranslations({ locale, namespace: "media.detail" });
  return (
    <>
      <TopBarTitle title={t("title")} />
      <MediaDetail locale={locale} item={toLibraryItem(media, null)} />
    </>
  );
}

import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MediaLibrary } from "@/features/media/library/media-library";
import { loadLibrary } from "@/features/media/queries/load-library";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { getViewer } from "@/features/shell/queries/get-viewer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "media.meta" });
  return { title: t("library") };
}

/** Medienbibliothek `/studio/medien` (PRD v2 11.3). Das Layout prüft die Anbieterrolle, die Aktionen das Eigentum. */
export default async function MediaLibraryPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const [t, viewer] = await Promise.all([getTranslations({ locale, namespace: "media.library" }), getViewer()]);
  const data = viewer.kind === "account" ? await loadLibrary(viewer.userId, locale, { withDetail: true }) : null;
  if (!data) notFound();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-reading text-body text-ink-muted">{t("intro")}</p>
      </div>
      <MediaLibrary data={data} />
    </div>
  );
}

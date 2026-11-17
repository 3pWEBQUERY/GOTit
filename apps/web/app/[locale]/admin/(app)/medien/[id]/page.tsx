import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { reviewerAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { MediaCaseView } from "@/features/admin/media/media-case-view";
import { getMediaCaseFor } from "@/features/admin/media/queries";
import { adminMetadata } from "@/features/admin/metadata";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "mediaCase");
}

/** Einzelfall `/admin/medien/[id]` (PRD v2 12.4). Unbekannte ID: 404. */
export default async function MediaCasePage({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { access, actor } = await reviewerAccess();
  if (!access.allowed || !actor) {
    const t = await getTranslations({ locale, namespace: "admin.media" });
    return <AreaRestricted locale={locale} title={t("title")} />;
  }
  const [media, query] = await Promise.all([getMediaCaseFor(actor.userId, id), searchParams]);
  if (!media) notFound();
  return <MediaCaseView locale={locale} media={media} alreadyDecided={query.hinweis === "entschieden"} now={new Date()} />;
}

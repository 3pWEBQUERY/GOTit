import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LinksPage } from "@/features/clubs/components/studio/links-page";
import { getViewer } from "@/features/shell/queries/get-viewer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "clubs.studio",
  });
  return { title: t("title") };
}

/** Verknüpfungen mit Clubs: Einladungen annehmen, lösen (PRD v2 7.6). */
export default async function StudioLinksRoute({ params }: Props) {
  const [{ locale }, viewer] = await Promise.all([params, getViewer()]);
  if (viewer.kind !== "account" || !viewer.provider) notFound();
  return <LinksPage locale={locale as Locale} userId={viewer.userId} />;
}

import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReceivedReviewsPage } from "@/features/reviews/components/studio/received-reviews-page";
import { getViewer } from "@/features/shell/queries/get-viewer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "reviews.meta",
  });
  return { title: t("received") };
}

/** Erhaltene Bewertungen, Stellungnahme und Einspruch (PRD v2 7.6, Entscheid 0017). */
export default async function StudioReviewsRoute({ params }: Props) {
  const [{ locale }, viewer] = await Promise.all([params, getViewer()]);
  if (viewer.kind !== "account" || !viewer.provider) notFound();
  return (
    <ReceivedReviewsPage
      locale={locale as Locale}
      userId={viewer.userId}
      providerName={viewer.provider.displayName}
    />
  );
}

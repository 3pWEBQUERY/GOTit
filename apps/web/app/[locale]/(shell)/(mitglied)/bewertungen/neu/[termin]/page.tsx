import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewReviewPage } from "@/features/reviews/components/member/new-review-page";

type Props = { params: Promise<{ locale: string; termin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "reviews.meta",
  });
  // Neutral: Der Browser-Tab nennt den Anbieter nicht (PRD 13, Diskretion).
  return { title: t("new") };
}

/** Bewertung schreiben nach einem stattgefundenen Termin (PRD v2 12.1, Entscheid 0017). */
export default async function NewReviewRoute({ params }: Props) {
  const { locale, termin } = await params;
  return <NewReviewPage locale={locale as Locale} bookingRequestId={termin} />;
}

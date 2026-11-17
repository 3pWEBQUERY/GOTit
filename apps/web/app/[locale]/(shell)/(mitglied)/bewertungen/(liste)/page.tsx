import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  OwnReviewsPage,
  SENT_PARAM,
} from "@/features/reviews/components/member/own-reviews-page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "reviews.meta",
  });
  return { title: t("own") };
}

/** Eigene Bewertungen und Termine, die auf eine Bewertung warten (PRD v2 7.5, 12.1). */
export default async function OwnReviewsRoute({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return (
    <OwnReviewsPage
      locale={locale as Locale}
      sent={query[SENT_PARAM] === "1"}
    />
  );
}

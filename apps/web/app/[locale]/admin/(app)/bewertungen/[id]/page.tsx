import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { adminMetadata } from "@/features/admin/metadata";
import { ReviewCaseView } from "@/features/reviews/components/admin/review-case-view";
import { getReviewCaseFor } from "@/features/reviews/queries/admin";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reviewCase");
}

/** Einzelfall `/admin/bewertungen/[id]` (v2 12.4). Jedes Öffnen schreibt `review.viewed` ins Audit-Log. */
export default async function ReviewCasePage({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { access, actor } = await moderationAccess();
  if (!access.allowed || !actor) {
    const t = await getTranslations({ locale, namespace: "reviews.admin" });
    return (
      <AreaRestricted
        locale={locale}
        title={t("title")}
        description={t("restricted")}
      />
    );
  }
  const [review, query] = await Promise.all([
    getReviewCaseFor(actor.userId, id),
    searchParams,
  ]);
  if (!review) notFound();
  return (
    <ReviewCaseView
      locale={locale}
      review={review}
      alreadyDecided={query.hinweis === "entschieden"}
      now={new Date()}
    />
  );
}

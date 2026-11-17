import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reviewerAccess } from "@/features/admin/access";
import { CaseView } from "@/features/admin/case/case-view";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { adminMetadata } from "@/features/admin/metadata";
import { getCase } from "@/features/admin/queries/get-case";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "case");
}

/** Einzelfall `/admin/verifizierungen/[id]` (PRD 12.4). Unbekannte ID: 404. */
export default async function VerificationCasePage({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { access } = await reviewerAccess();
  if (!access.allowed) return <AreaRestricted locale={locale} />;
  const [review, query] = await Promise.all([getCase(id), searchParams]);
  if (!review) notFound();
  return <CaseView locale={locale} review={review} alreadyDecided={query.hinweis === "entschieden"} now={new Date()} />;
}

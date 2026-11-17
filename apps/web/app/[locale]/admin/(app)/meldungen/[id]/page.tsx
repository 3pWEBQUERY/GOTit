import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { adminMetadata } from "@/features/admin/metadata";
import { getReportFor } from "@/features/admin/reports/queries";
import { ReportCaseView } from "@/features/admin/reports/report-case-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reportCase");
}

/** Einzelfall `/admin/meldungen/[id]` (v2 12.4), lesend bis Schritt 1.13. Jedes Öffnen schreibt einen Audit-Eintrag. */
export default async function ReportCasePage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { access, actor } = await moderationAccess();
  if (!access.allowed || !actor) {
    const t = await getTranslations({ locale, namespace: "admin.reports" });
    return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  }
  const report = await getReportFor(actor.userId, id);
  if (!report) notFound();
  return <ReportCaseView locale={locale} report={report} now={new Date()} />;
}

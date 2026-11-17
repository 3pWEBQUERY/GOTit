import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { adminMetadata } from "@/features/admin/metadata";
import { ModerationCaseView } from "@/features/admin/moderation/case-view";
import { caseRights, getAccountHistory, getCaseFor, staffNames } from "@/features/admin/moderation/queries";

type Props = { params: Promise<{ locale: string; fall: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reportCase");
}

/** Einzelfall `/admin/moderation/[fall]` (v2 7.8, 12.4). Jedes Öffnen schreibt `report.viewed` ins Audit-Log. */
export default async function ModerationCasePage({ params, searchParams }: Props) {
  const { locale: rawLocale, fall } = await params;
  const locale = rawLocale as Locale;
  const { access, actor } = await moderationAccess();
  if (!access.allowed || !actor) {
    const t = await getTranslations({ locale, namespace: "moderation" });
    return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  }
  const [report, query] = await Promise.all([getCaseFor(actor.userId, fall), searchParams]);
  if (!report) notFound();
  const [history, names] = await Promise.all([getAccountHistory(actor.userId, report.id), staffNames([report.assignedTo.id, report.decidedById])]);
  return (
    <ModerationCaseView
      locale={locale}
      report={report}
      actor={actor}
      rights={caseRights(actor, report)}
      history={history}
      names={names}
      alreadyDecided={query.hinweis === "entschieden"}
      now={new Date()}
    />
  );
}

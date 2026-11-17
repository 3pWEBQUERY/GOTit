import type { Locale } from "@app/core/locale";
import type { PartyLabel, ReportView } from "@app/core/moderation";
import { InlineAlert } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { AdminPageHeader } from "../components/page-header";
import { caseAge } from "../queue/case-age";
import { EvidencePanel } from "./evidence-panel";
import { reasonLabel } from "./reason-label";
import { UrgentBadge } from "./urgent-badge";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-wrap text-ink">{children}</dd>
    </div>
  );
}

/**
 * Einzelfall einer Meldung (PRD v2 12.4), vorerst lesend: Angaben links, die
 * verdeckte Kopie in der Mitte, rechts der Hinweis auf die Entscheide in 1.13.
 */
export async function ReportCaseView({ locale, report, now }: { locale: Locale; report: ReportView; now: Date }) {
  const [t, tAdmin, format] = await Promise.all([getTranslations({ locale, namespace: "admin.reports" }), getTranslations({ locale, namespace: "admin" }), getFormatter({ locale })]);
  const href = createHref(locale);
  const age = caseAge(report.createdAt, now);
  const submitted = format.dateTime(report.createdAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const ageLabel = age.unit === "lessThanHour" ? tAdmin("queue.age.lessThanHour") : tAdmin(`queue.age.${age.unit}`, { count: age.count });
  const party = (label: PartyLabel) => (label.exists ? (label.name ?? t("memberFallback")) : t("gone"));
  const title = t(`caseTitle.${report.targetType}`);

  return (
    <>
      <AdminPageHeader
        title={title}
        crumbsLabel={tAdmin("shell.breadcrumbs")}
        crumbs={[{ label: tAdmin("shell.overview"), href: href("/admin") }, { label: tAdmin("shell.reports"), href: href("/admin/meldungen") }, { label: title }]}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {report.urgent ? <UrgentBadge label={t("urgent")} /> : null}
        <p className="text-small text-ink-muted">{t("meta", { submitted, age: ageLabel, state: t(`status.${report.status}`) })}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-labelledby="meldung-angaben" className="flex min-w-0 flex-col gap-2">
          <h2 id="meldung-angaben" className="text-h3">
            {t("facts.title")}
          </h2>
          <dl>
            <Fact label={t("facts.reason")}>{reasonLabel(t, report.reason)}</Fact>
            <Fact label={t("facts.details")}>{report.details ?? t("facts.noDetails")}</Fact>
            <Fact label={t("facts.target")}>
              {t(`targetType.${report.targetType}`)} · {party(report.target)}
            </Fact>
            <Fact label={t("facts.reporter")}>{party(report.reporter)}</Fact>
          </dl>
        </section>
        <EvidencePanel reportId={report.id} count={report.evidence.count} />
        <section aria-labelledby="meldung-entscheid" className="flex min-w-0 flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <h2 id="meldung-entscheid" className="text-h3">
            {t("decision.title")}
          </h2>
          <InlineAlert title={t("decision.laterTitle")}>{t("decision.laterText")}</InlineAlert>
        </section>
      </div>
    </>
  );
}

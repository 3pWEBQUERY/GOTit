import type { AdminActor } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { mediaUrl } from "@app/core/media/variants";
import type { AccountHistory, PartyLabel, ReportView } from "@app/core/moderation";
import { InlineAlert, UiLink } from "@app/ui";
import { EyeOff } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { AdminPageHeader } from "../components/page-header";
import { caseAge } from "../queue/case-age";
import { MediaReveal } from "../media/media-reveal";
import { EvidencePanel } from "../reports/evidence-panel";
import { reasonLabel } from "../reports/reason-label";
import { AssignControls } from "./assign-controls";
import { formatCaseId } from "./case-id";
import { CaseDecisionPanel } from "./case-decision-panel";
import { CaseHistory } from "./case-history";
import { PriorityBadge } from "./priority-badge";
import type { CaseRights } from "./queries";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-wrap text-ink">{children}</dd>
    </div>
  );
}

/**
 * Gemeldeter Inhalt, standardmässig verdeckt (v2 12.4). Medien kommen über
 * die geprüfte Route `/media/case/[fall]`, die jeden Abruf protokolliert.
 */
function ReportedContent({ report, t, reviewHref }: { report: ReportView; t: (key: string) => string; reviewHref: string | null }) {
  if (report.evidence.kind !== "none") return <EvidencePanel reportId={report.id} count={report.evidence.count} />;
  if (report.targetType === "MEDIA" && report.target.exists) {
    const variant = mediaUrl(report.targetId, 960, "webp").split("/").pop() ?? "";
    return <MediaReveal src={`/media/case/${report.id}/${variant}`} alt={t("content.mediaAlt")} ratio="4 / 5" placeholderColor={null} />;
  }
  return (
    <section aria-labelledby="fall-inhalt" className="flex min-w-0 flex-col gap-3">
      <h2 id="fall-inhalt" className="text-h3">
        {t("content.title")}
      </h2>
      <div className="flex items-start gap-3 rounded-control bg-surface-2 p-4" data-content-preview="hidden">
        <EyeOff aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-ink-muted" />
        <p className="max-w-prose text-small text-ink-muted">
          {t(`content.note.${report.targetType}`)}
          {reviewHref ? (
            <>
              {" "}
              <UiLink href={reviewHref} className="text-ink underline underline-offset-4">
                {t("content.openReview")}
              </UiLink>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}

/**
 * Einzelfall `/admin/moderation/[fall]` nach der Skizze in v2 12.4: Kopf mit
 * Fall-ID, Kategorie und Priorität, Status und Zuständigkeit; in der Mitte
 * Inhalt, Meldegrund und Verlauf des Kontos; rechts der Entscheid.
 */
export async function ModerationCaseView({
  locale,
  report,
  actor,
  rights,
  history,
  names,
  alreadyDecided,
  now,
}: {
  locale: Locale;
  report: ReportView;
  actor: AdminActor;
  rights: CaseRights;
  history: AccountHistory | null;
  names: Map<string, string>;
  alreadyDecided: boolean;
  now: Date;
}) {
  const [t, tReports, tAdmin, format] = await Promise.all([
    getTranslations({ locale, namespace: "moderation" }),
    getTranslations({ locale, namespace: "admin.reports" }),
    getTranslations({ locale, namespace: "admin" }),
    getFormatter({ locale }),
  ]);
  const href = createHref(locale);
  const queueHref = href("/admin/moderation");
  const caseHref = (id: string) => href({ pathname: "/admin/moderation/[fall]", params: { fall: id } });
  const caseId = formatCaseId(report.number, report.createdAt);
  const stamp = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const day = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric" });
  const age = caseAge(report.createdAt, now);
  const ageLabel = age.unit === "lessThanHour" ? tAdmin("queue.age.lessThanHour") : tAdmin(`queue.age.${age.unit}`, { count: age.count });
  const party = (label: PartyLabel) => (label.exists ? (label.name ?? t("memberFallback")) : t("gone"));
  const priority = t(`priority.${report.priority}`);
  const title = t("caseTitle", { id: caseId, target: t(`targetType.${report.targetType}`), priority });
  const assignee = report.assignedTo.id === actor.userId ? t("queue.me") : report.assignedTo.id ? (names.get(report.assignedTo.id) ?? t("queue.unknownPerson")) : t("queue.unassigned");
  const open = report.status === "OPEN" || report.status === "IN_REVIEW";

  return (
    <>
      <AdminPageHeader title={title} crumbsLabel={tAdmin("shell.breadcrumbs")} crumbs={[{ label: tAdmin("shell.overview"), href: href("/admin") }, { label: t("title"), href: queueHref }, { label: caseId }]} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-case-meta>
          <PriorityBadge priority={report.priority} label={t(`priorityLabel.${report.priority}`)} />
          <p className="text-small text-ink">{t("meta.status", { status: t(`status.${report.status}`) })}</p>
          <p className="text-small text-ink" data-case-assignee>
            {t("meta.assignee", { name: assignee })}
          </p>
          <p className="text-small text-ink-muted">{t("meta.submitted", { submitted: stamp(report.createdAt), age: ageLabel })}</p>
        </div>
        {open && rights.decide ? (
          <div className="hidden lg:block">
            <AssignControls reportId={report.id} assignedToMe={report.assignedTo.id === actor.userId} assigned={report.assignedTo.id !== null} />
          </div>
        ) : null}
        {report.escalatedAt ? <InlineAlert tone="warning" title={t("notes.escalated", { date: stamp(report.escalatedAt) })}>{t("notes.escalatedText")}</InlineAlert> : null}
        {report.contentBlockedAt ? <InlineAlert title={t("notes.blocked", { date: stamp(report.contentBlockedAt) })}>{t("notes.blockedText")}</InlineAlert> : null}
        {alreadyDecided ? (
          <InlineAlert tone="warning" title={t("errors.alreadyDecided")}>
            {t("notes.alreadyDecidedHelp")}
          </InlineAlert>
        ) : null}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-8">
          <ReportedContent report={report} t={t} reviewHref={report.reviewId ? href({ pathname: "/admin/bewertungen/[id]", params: { id: report.reviewId } }) : null} />
          <section aria-labelledby="fall-angaben" className="flex min-w-0 flex-col gap-2">
            <h2 id="fall-angaben" className="text-h3">
              {t("facts.title")}
            </h2>
            <dl>
              <Fact label={t("facts.reason")}>{reasonLabel(tReports, report.reason)}</Fact>
              <Fact label={t("facts.details")}>{report.details ?? t("facts.noDetails")}</Fact>
              <Fact label={t("facts.target")}>
                {t(`targetType.${report.targetType}`)} · {party(report.target)}
              </Fact>
              <Fact label={t("facts.reporter")}>{report.reporter.exists ? party(report.reporter) : t("facts.anonymous")}</Fact>
              {report.targetUrl ? <Fact label={t("facts.url")}>{report.targetUrl}</Fact> : null}
              {report.targetUrl || report.contactEmail ? <Fact label={t("facts.contactEmail")}>{report.contactEmail ?? t("facts.noContact")}</Fact> : null}
            </dl>
          </section>
          <CaseHistory history={history} t={t} reason={(key) => reasonLabel(tReports, key)} day={day} caseHref={caseHref} />
        </div>
        <section aria-labelledby="fall-entscheid" className="flex min-w-0 flex-col gap-4">
          <h2 id="fall-entscheid" className="text-h3">
            {t("decision.title")}
          </h2>
          <CaseDecisionPanel report={report} actor={actor} rights={rights} names={names} t={t} stamp={stamp} queueHref={queueHref} caseHrefBase={`${queueHref}/`} now={now} />
        </section>
      </div>
    </>
  );
}

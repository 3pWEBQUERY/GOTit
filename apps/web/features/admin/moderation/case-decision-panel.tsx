import type { AdminActor } from "@app/core/admin";
import { MODERATION_RULE_KEYS, type ReportView } from "@app/core/moderation";
import { zonedDay } from "@app/core/booking";
import { InlineAlert } from "@app/ui";
import type { ReactNode } from "react";
import { AppealDecisionForm } from "./appeal-decision-form";
import { CaseDecisionForm } from "./case-decision-form";
import { availableDecisions, type CaseRights } from "./queries";

type Translate = { (key: string, values?: Record<string, string | number>): string; has: (key: string) => boolean };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-wrap text-ink">{children}</dd>
    </div>
  );
}

/** Unter 1024 px ist der Admin nur lesend (v2 12.4); Formulare stehen erst ab dort. */
function WideOnly({ children, t }: { children: ReactNode; t: Translate }) {
  return (
    <>
      <div className="hidden flex-col gap-6 lg:flex">{children}</div>
      <div className="lg:hidden">
        <InlineAlert title={t("readOnly.title")}>{t("readOnly.text")}</InlineAlert>
      </div>
    </>
  );
}

/**
 * Rechte Spalte des Falls (v2 12.4): offen das Formular, sofern die Person
 * entscheiden darf, sonst wer entscheidet; entschieden die Zusammenfassung
 * und der Einspruch. Über einen Einspruch entscheidet nie, wer den Fall
 * entschieden hat.
 */
export function CaseDecisionPanel({
  report,
  actor,
  rights,
  names,
  t,
  stamp,
  queueHref,
  caseHrefBase,
  now,
}: {
  report: ReportView;
  actor: AdminActor;
  rights: CaseRights;
  names: Map<string, string>;
  t: Translate;
  stamp: (value: Date) => string;
  queueHref: string;
  caseHrefBase: string;
  now: Date;
}) {
  const open = report.status === "OPEN" || report.status === "IN_REVIEW";
  const ruleLabels = Object.fromEntries(MODERATION_RULE_KEYS.map((key) => [key, t(`rules.${key}`)]));
  const decidedByMe = report.decidedById === actor.userId && !actor.roles.includes("SUPER_ADMIN");

  if (open) {
    if (!rights.decide) {
      return (
        <div data-critical-note>
          <InlineAlert title={t("decision.criticalTitle")}>{t("decision.criticalText")}</InlineAlert>
        </div>
      );
    }
    const decisions = availableDecisions(report, rights).map((value) => ({
      value,
      label: t(`decisionLabel.${value}`),
      hint: t.has(`decisionHint.${value}.${report.targetType}`) ? t(`decisionHint.${value}.${report.targetType}`) : t(`decisionHint.${value}.default`),
    }));
    return (
      <WideOnly t={t}>
        <CaseDecisionForm
          reportId={report.id}
          decisions={decisions}
          ruleKeys={MODERATION_RULE_KEYS}
          ruleLabels={ruleLabels}
          queueHref={queueHref}
          caseHrefBase={caseHrefBase}
          today={zonedDay(now, "Europe/Zurich").day}
        />
      </WideOnly>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <dl data-decision-summary>
        <Fact label={t("summary.result")}>{report.decision ? t(`decisionLabel.${report.decision}`) : t(`status.${report.status}`)}</Fact>
        <Fact label={t("summary.rule")}>{report.rule ? `${report.rule} ${ruleLabels[report.rule] ?? ""}`.trim() : "–"}</Fact>
        <Fact label={t("summary.reason")}>{report.decisionReason ?? "–"}</Fact>
        <Fact label={t("summary.decidedBy")}>{report.decidedById ? (report.decidedById === actor.userId ? t("queue.me") : (names.get(report.decidedById) ?? t("queue.unknownPerson"))) : "–"}</Fact>
        <Fact label={t("summary.decidedAt")}>{report.decidedAt ? stamp(report.decidedAt) : "–"}</Fact>
      </dl>
      {report.appealStatus !== "NONE" ? (
        <section aria-labelledby="fall-einspruch" className="flex flex-col gap-3" data-case-appeal={report.appealStatus}>
          <h3 id="fall-einspruch" className="text-h3">
            {t("appeal.title")}
          </h3>
          <p className="text-small text-ink-muted">
            {t(`appeal.status.${report.appealStatus}`)}
            {report.appealedAt ? ` · ${t("appeal.filedAt", { date: stamp(report.appealedAt) })}` : null}
          </p>
          <p className="rounded-control bg-surface-2 p-4 text-body break-words whitespace-pre-wrap">{report.appealReason ?? "–"}</p>
          {report.appealStatus === "OPEN" ? (
            !rights.decide ? (
              <InlineAlert title={t("decision.criticalTitle")}>{t("decision.criticalText")}</InlineAlert>
            ) : decidedByMe ? (
              <div data-same-person-note>
                <InlineAlert title={t("appeal.ownTitle")}>{t("appeal.ownText")}</InlineAlert>
              </div>
            ) : (
              <WideOnly t={t}>
                <AppealDecisionForm id={report.id} kind="case" />
              </WideOnly>
            )
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

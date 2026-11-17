import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import type { ReviewCase } from "../queries/get-case";
import { FIELD_NOTE_AREAS, REVIEW_RULES } from "../rules";
import { DecisionForm } from "./decision-form";

export interface DecisionPanelProps {
  locale: Locale;
  review: ReviewCase;
  /** Ein zweiter Entscheid traf auf einen bereits entschiedenen Fall. */
  alreadyDecided: boolean;
}

function notesOf(value: unknown): [string, string][] {
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
}

/**
 * Rechte Spalte: offene Fälle haben das Formular, ab 1024 px; darunter ein
 * Hinweis, denn der Admin ist dort nur lesend (PRD 12.4). Entschiedene Fälle
 * zeigen den Entscheid nur lesend.
 */
export async function DecisionPanel({ locale, review, alreadyDecided }: DecisionPanelProps) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "admin" }), getFormatter({ locale })]);
  const heading = (
    <h2 id="entscheid-titel" className="text-h3">
      {t("decision.title")}
    </h2>
  );

  if (review.decision === null) {
    return (
      <section aria-labelledby="entscheid-titel" className="flex min-w-0 flex-col gap-4">
        {heading}
        <div className="hidden lg:block">
          <DecisionForm reviewId={review.id} kind={review.kind} queueHref={createHref(locale)("/admin/verifizierungen")} />
        </div>
        <div className="lg:hidden" data-read-only-notice>
          <InlineAlert title={t("decision.readOnlyTitle")}>{t("decision.readOnlyDescription")}</InlineAlert>
        </div>
      </section>
    );
  }

  const rule = REVIEW_RULES.find((entry) => entry.id === review.rule);
  const notes = notesOf(review.fieldNotes).filter(([area]) => (FIELD_NOTE_AREAS as readonly string[]).includes(area));
  return (
    <section aria-labelledby="entscheid-titel" className="flex min-w-0 flex-col gap-4" data-decision-readonly>
      {heading}
      {alreadyDecided ? <InlineAlert tone="warning" title={t("errors.alreadyDecided")}>{t("decision.alreadyDecidedHelp")}</InlineAlert> : null}
      <dl className="flex flex-col">
        <div className="flex flex-col gap-1 border-b border-border py-3">
          <dt className="text-label text-ink-muted">{t("decision.result")}</dt>
          <dd className="text-body font-[550] text-ink">{t(`case.decisionLabel.${review.decision}`)}</dd>
        </div>
        {review.decidedAt ? (
          <div className="flex flex-col gap-1 border-b border-border py-3">
            <dt className="text-label text-ink-muted">{t("decision.decidedAt")}</dt>
            <dd className="tabular text-body text-ink">
              {format.dateTime(review.decidedAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-1 border-b border-border py-3">
          <dt className="text-label text-ink-muted">{t("decision.rule")}</dt>
          <dd className="text-body text-ink">{rule ? `${rule.id} ${t(`rules.${rule.key}`)}` : (review.rule ?? "")}</dd>
        </div>
        <div className="flex flex-col gap-1 border-b border-border py-3">
          <dt className="text-label text-ink-muted">{t("decision.reason")}</dt>
          <dd className="text-body break-words whitespace-pre-line text-ink">{review.reason}</dd>
        </div>
        {notes.map(([area, text]) => (
          <div key={area} className="flex flex-col gap-1 border-b border-border py-3">
            <dt className="text-label text-ink-muted">{t(`decision.area.${area}`)}</dt>
            <dd className="text-body break-words text-ink">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

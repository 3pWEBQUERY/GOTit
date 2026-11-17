import type { AccountHistory } from "@app/core/moderation";
import { InlineAlert, UiLink } from "@app/ui";
import { formatCaseId } from "./case-id";

type Translate = { (key: string, values?: Record<string, string | number>): string; has: (key: string) => boolean };

/**
 * Verlauf des Kontos hinter dem gemeldeten Inhalt (v2 12.4 «frühere
 * Fälle»): Meldungen gegen Konto und Profil und Einschränkungen, neueste
 * zuerst. Ohne Inhalte; jede frühere Meldung führt zu ihrem Fall.
 */
export function CaseHistory({
  history,
  t,
  reason,
  day,
  caseHref,
}: {
  history: AccountHistory | null;
  t: Translate;
  reason: (key: string) => string;
  day: (value: Date) => string;
  caseHref: (id: string) => string;
}) {
  return (
    <section aria-labelledby="fall-verlauf" className="flex min-w-0 flex-col gap-3" data-case-history>
      <h2 id="fall-verlauf" className="text-h3">
        {t("history.title")}
      </h2>
      {history === null ? (
        <InlineAlert title={t("history.criticalOnly")} />
      ) : history.accountId === null ? (
        <p className="text-small text-ink-muted">{t("history.noAccount")}</p>
      ) : (
        <>
          <h3 className="text-label text-ink-muted">{t("history.cases")}</h3>
          {history.earlierCases.length === 0 ? (
            <p className="text-small text-ink-muted">{t("history.noCases")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {history.earlierCases.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-small">
                  <UiLink href={caseHref(entry.id)} className="tabular font-[550] text-ink underline underline-offset-4">
                    {formatCaseId(entry.number, entry.createdAt)}
                  </UiLink>
                  <span>{reason(entry.reason)}</span>
                  <span className="text-ink-muted">{entry.decision ? t(`decisionLabel.${entry.decision}`) : t("history.undecided")}</span>
                  <time dateTime={entry.createdAt.toISOString()} className="tabular text-ink-muted">
                    {day(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-2 text-label text-ink-muted">{t("history.restrictions")}</h3>
          {history.restrictions.length === 0 ? (
            <p className="text-small text-ink-muted">{t("history.noRestrictions")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {history.restrictions.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-small" data-history-restriction={entry.kind}>
                  <span className="font-[550]">{t(`restrictionKind.${entry.kind}`)}</span>
                  <span>{entry.rule}</span>
                  <span className="text-ink-muted">
                    {entry.liftedAt
                      ? t("history.lifted", { date: day(entry.liftedAt) })
                      : entry.until
                        ? t("history.until", { date: day(entry.until) })
                        : t("history.noEnd")}
                  </span>
                  <time dateTime={entry.createdAt.toISOString()} className="tabular text-ink-muted">
                    {t("history.since", { date: day(entry.createdAt) })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

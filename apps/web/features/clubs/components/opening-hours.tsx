import { cn } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";
import {
  formatMinute,
  formatSpan,
  todayStatus,
  weeklyRows,
  type HoursException,
  type HoursWindow,
} from "../lib/opening-hours";

/** Ein Sonntag als Bezug, damit der Wochentag in der Sprache der Seite erscheint. */
const SUNDAY = Date.UTC(2026, 10, 15, 12);
const dayOf = (weekday: number) => new Date(SUNDAY + weekday * 86_400_000);

/** «Heute geöffnet bis 02:00», «Heute geschlossen» … in Europe/Zurich (v2 9.4). */
export function TodayLine({
  hours,
  exceptions,
  now,
  className,
}: {
  hours: readonly HoursWindow[];
  exceptions: readonly HoursException[];
  now: Date;
  className?: string;
}) {
  const t = useTranslations("clubs.hours.today");
  const status = todayStatus(hours, exceptions, now);
  const open = status.kind === "open";
  const text =
    status.kind === "open"
      ? t("open", { until: formatMinute(status.until) })
      : status.kind === "later"
        ? t("later", {
            from: formatMinute(status.from),
            until: formatMinute(status.until),
          })
        : t(status.kind);
  return (
    <p
      data-today-status={status.kind}
      className={cn(
        "flex items-center gap-2 text-body",
        open ? "text-ink" : "text-ink-muted",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          open ? "bg-success" : "bg-border-strong",
        )}
      />
      {text}
    </p>
  );
}

/** Wochenzeiten ab Montag als Tabelle; die Nacht über Mitternacht steht am Vortag. */
export function WeeklyHours({
  hours,
  caption,
}: {
  hours: readonly HoursWindow[];
  caption: string;
}) {
  const t = useTranslations("clubs.hours");
  const format = useFormatter();
  if (hours.length === 0)
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  return (
    <table className="w-full max-w-panel text-body">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t("day")}</th>
          <th scope="col">{t("time")}</th>
        </tr>
      </thead>
      <tbody>
        {weeklyRows(hours).map((row) => (
          <tr
            key={row.weekday}
            className="border-b border-border last:border-0"
          >
            <th
              scope="row"
              className="py-2 pr-4 text-left font-normal text-ink-muted"
            >
              {format.dateTime(dayOf(row.weekday), {
                weekday: "long",
                timeZone: "UTC",
              })}
            </th>
            <td className="tabular py-2 text-ink">
              {row.spans.length > 0
                ? row.spans.map(formatSpan).join(", ")
                : t("closed")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Kommende Tage mit anderen Zeiten oder geschlossen. Ohne Einträge entfällt die Liste. */
export function UpcomingExceptions({
  exceptions,
  limit,
  headingId,
  level,
}: {
  exceptions: readonly HoursException[];
  limit?: number;
  headingId: string;
  level: 3 | 4;
}) {
  const t = useTranslations("clubs.hours");
  const format = useFormatter();
  const shown = limit ? exceptions.slice(0, limit) : exceptions;
  if (shown.length === 0) return null;
  const Heading = `h${level}` as const;
  return (
    <div className="flex flex-col gap-2">
      <Heading id={headingId} className="text-h3">
        {t("exceptions")}
      </Heading>
      <ul aria-labelledby={headingId} className="flex flex-col gap-1 text-body">
        {shown.map((entry) => {
          const date = format.dateTime(new Date(`${entry.day}T12:00:00Z`), {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          });
          const time =
            entry.closed ||
            entry.startMinute === null ||
            entry.endMinute === null
              ? t("closed")
              : formatSpan({ start: entry.startMinute, end: entry.endMinute });
          return (
            <li key={entry.day} data-exception={entry.day}>
              <span className="tabular text-ink">{date}</span>
              <span className="text-ink-muted"> · {time}</span>
              {entry.note ? (
                <span className="text-ink-muted"> · {entry.note}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

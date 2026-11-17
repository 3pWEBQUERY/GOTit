import { UiLink, buttonVariants } from "@app/ui";
import type { TodayRow } from "../queries/load-today";

/** Spalte «Heute» (PRD v2 11.1): die heutigen Kalendereinträge und der Weg zum Kalender. */
export function TodayCalendar({
  rows,
  labels,
  calendarHref,
}: {
  rows: readonly TodayRow[];
  labels: { heading: string; empty: string; open: string; list: string };
  calendarHref: string;
}) {
  return (
    <section
      aria-labelledby="today-calendar-heading"
      data-today-calendar
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-6"
    >
      <h2 id="today-calendar-heading" className="text-h2">
        {labels.heading}
      </h2>
      {rows.length === 0 ? (
        <p className="text-body text-ink-muted">{labels.empty}</p>
      ) : (
        <ul
          aria-label={labels.list}
          className="flex flex-col divide-y divide-border"
        >
          {rows.map((row) => {
            const content = (
              <>
                <span className="tabular shrink-0 text-small text-ink-muted">
                  {row.time}
                </span>
                <span className="min-w-0">{row.label}</span>
              </>
            );
            return (
              <li key={row.key} data-today-entry className="py-2 text-body">
                {row.href ? (
                  <UiLink
                    href={row.href}
                    className="flex min-h-11 flex-wrap items-baseline gap-x-3 text-ink underline-offset-4 hover:text-accent hover:underline"
                  >
                    {content}
                  </UiLink>
                ) : (
                  <span className="flex min-h-11 flex-wrap items-baseline gap-x-3">
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <UiLink
        href={calendarHref}
        className={`${buttonVariants({ variant: "secondary" })} self-start`}
      >
        {labels.open}
      </UiLink>
    </section>
  );
}

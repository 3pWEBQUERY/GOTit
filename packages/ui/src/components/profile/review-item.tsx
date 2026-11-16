import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface ReviewRating {
  key: string;
  /** Bewertete Kategorie, zum Beispiel «Kommunikation». */
  label: string;
  /** Wert als fertiger Text, zum Beispiel «5 von 5». */
  value: string;
}

export interface ReviewResponse {
  /** Beschriftung, zum Beispiel «Stellungnahme von Beispielname». */
  label: string;
  /** Fertiges Datum der Stellungnahme. */
  date?: string;
  text: ReactNode;
}

export interface ReviewItemProps {
  /** Fertiges Datum der Bewertung, zum Beispiel «12.10.2026». */
  date: string;
  /** Maschinenlesbares Datum (ISO). */
  dateTime?: string;
  /** Verifikationsart als Wort, zum Beispiel «Nach bestätigtem Termin». */
  verification: string;
  /** Bewertete Kategorien als Text mit Wert. Keine Sterne. */
  ratings?: readonly ReviewRating[];
  /** Text der Bewertung. */
  children: ReactNode;
  /** Stellungnahme des Anbieters; steht direkt unter der Bewertung. */
  response?: ReviewResponse;
  /** Aktionen, zum Beispiel «Bewertung melden». */
  actions?: ReactNode;
  className?: string;
}

/** Eine Bewertung (PRD 10.1): Datum, Verifikationsart, Kategorien als Text, darunter die Stellungnahme des Anbieters. */
export function ReviewItem({ date, dateTime, verification, ratings = [], children, response, actions, className }: ReviewItemProps) {
  return (
    <article className={cn("flex flex-col gap-3 text-ink", className)}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
        <time dateTime={dateTime} className="tabular">
          {date}
        </time>
        <span className="inline-flex items-center gap-1 text-ink">
          <BadgeCheck aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-ink-muted" />
          {verification}
        </span>
      </p>
      {ratings.length > 0 ? (
        <dl className="tabular flex flex-wrap gap-x-6 gap-y-1 text-small">
          {ratings.map((rating) => (
            <div key={rating.key} className="flex gap-1">
              <dt className="text-ink-muted">{rating.label}</dt>
              <dd className="font-[550]">{rating.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="max-w-prose text-body">{children}</div>
      {response ? (
        <div className="ml-4 flex max-w-prose flex-col gap-1 border-l-2 border-border-strong pl-4">
          <p className="flex flex-wrap gap-x-3 text-label text-ink-muted">
            <span>{response.label}</span>
            {response.date ? <span className="tabular font-normal">{response.date}</span> : null}
          </p>
          <div className="text-body">{response.text}</div>
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

import type { ReactNode } from "react";
import { cn } from "../../cn";
import { BookingStatusIcon, type BookingStatus } from "./status-pill";

export interface BookingTimelineEvent {
  id: string;
  /** Legt das Icon fest. Ohne Angabe steht ein neutraler Punkt. */
  status?: BookingStatus;
  /** Der Status als Wort, zum Beispiel «Bestätigt». */
  statusLabel: string;
  /** Zeitpunkt als fertiger Text, zum Beispiel «vor 2 Stunden» oder «16.11.2026, 14:05». */
  time: string;
  /** Genaues Datum für den Tooltip, zum Beispiel «16.11.2026, 14:05». */
  exactTime: string;
  /** Maschinenlesbarer Zeitpunkt für `<time dateTime>`. */
  dateTime?: string;
  /** Wer den Wechsel ausgelöst hat, zum Beispiel «Beispielname» oder «System». */
  actor: string;
  note?: ReactNode;
}

export interface BookingTimelineProps {
  /** Ereignisse in der Reihenfolge der Anzeige. */
  events: readonly BookingTimelineEvent[];
  /** Zugänglicher Name der Liste, zum Beispiel «Verlauf der Terminanfrage». */
  label: string;
  /** Wo das neueste Ereignis steht. Es wird hervorgehoben. */
  newest?: "first" | "last";
  /** Wort für das neueste Ereignis, für Screenreader, zum Beispiel «Aktueller Stand». */
  latestLabel?: string;
  className?: string;
}

/** Verlauf einer Terminanfrage: jeder Statuswechsel als Ereignis mit Wort, Zeitpunkt und Akteur (PRD 11.5). */
export function BookingTimeline({ events, label, newest = "first", latestLabel, className }: BookingTimelineProps) {
  const latestIndex = newest === "first" ? 0 : events.length - 1;
  return (
    <ol aria-label={label} className={cn("flex flex-col", className)}>
      {events.map((event, index) => {
        const latest = index === latestIndex;
        const last = index === events.length - 1;
        return (
          <li key={event.id} aria-current={latest ? "step" : undefined} className="relative flex gap-3 pb-6 last:pb-0">
            {last ? null : <span aria-hidden className="absolute top-6 bottom-0 left-3 w-px -translate-x-1/2 bg-border" />}
            <span className={cn("relative flex size-6 shrink-0 items-center justify-center rounded-full border bg-surface", latest ? "border-ink text-ink" : "border-border text-ink-muted")}>
              {event.status ? <BookingStatusIcon status={event.status} className="size-4" /> : <span aria-hidden className="size-2 rounded-full bg-current" />}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className={cn("text-body", latest ? "font-[600] text-ink" : "text-ink")}>
                {latest && latestLabel ? <span className="sr-only">{latestLabel} </span> : null}
                {event.statusLabel}
              </p>
              <p className="text-small text-ink-muted">
                <time dateTime={event.dateTime} title={event.exactTime} className="tabular">
                  {event.time}
                </time>
                <span aria-hidden> · </span>
                <span>{event.actor}</span>
              </p>
              {event.note ? <p className="max-w-prose text-small text-ink">{event.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

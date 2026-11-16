import { MapPin } from "lucide-react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export interface EventCardProps {
  /** Tag als fertiger Text, zum Beispiel «21». */
  day: string;
  /** Monat als fertiger Text, zum Beispiel «Nov.». */
  month: string;
  /** Maschinenlesbares Datum, zum Beispiel `2026-11-21` oder `2026-11-21T19:00`. */
  dateTime: string;
  /** Ganzes Datum für Screenreader und Tooltip, zum Beispiel «Samstag, 21. November 2026, 19:00». */
  dateLabel: string;
  title: string;
  href: string;
  /** Ort und Region, zum Beispiel «Beispielort, Bern». */
  location: string;
  /** Veranstalter als fertiger Text, zum Beispiel «Veranstaltet von Beispielstudio». */
  organizer: string;
  /** Zusatz unter dem Titel, zum Beispiel die Uhrzeit «19:00–23:00». */
  timeRange?: string;
  /** Überschriftenebene des Titels, passend zur Seite. */
  titleAs?: "h2" | "h3" | "h4" | "p";
  className?: string;
}

/** Veranstaltung als ruhige Karte: Datum prominent als Text, Titel als Link, Ort und Veranstalter. Kein Bild nötig. */
export function EventCard({ day, month, dateTime, dateLabel, title, href, location, organizer, timeRange, titleAs: Title = "h3", className }: EventCardProps) {
  return (
    <article className={cn("relative flex gap-4 rounded-card border border-border bg-surface p-4 transition-colors duration-state hover:border-border-strong", className)}>
      <time dateTime={dateTime} title={dateLabel} className="flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-control bg-surface-2 py-2 text-ink">
        <span aria-hidden className="tabular text-h2">
          {day}
        </span>
        <span aria-hidden className="text-label">
          {month}
        </span>
        <span className="sr-only">{dateLabel}</span>
      </time>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title className="text-body font-[600] text-ink">
          <UiLink href={href} className="underline-offset-4 after:absolute after:inset-0 after:rounded-card hover:underline">
            {title}
          </UiLink>
        </Title>
        {timeRange ? <p className="tabular text-small text-ink">{timeRange}</p> : null}
        <p className="flex items-start gap-1 text-small text-ink-muted">
          <MapPin aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0" />
          <span>{location}</span>
        </p>
        <p className="text-small text-ink-muted">{organizer}</p>
      </div>
    </article>
  );
}

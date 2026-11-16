import { cn } from "../../cn";
import type { CalendarEntryKind } from "./calendar-types";

const markClasses: Record<CalendarEntryKind, string> = {
  available: "h-1 w-3 rounded-full bg-border-strong",
  request: "size-2 rounded-full border border-ink",
  confirmed: "size-2 rounded-full bg-accent",
  blocker: "size-2 bg-ink-muted",
};

/** Kleine Marke je Art: Strich, Ring, Punkt, Quadrat. Die Form unterscheidet, nicht nur die Farbe. Rein dekorativ. */
export function CalendarKindMark({ kind, className }: { kind: CalendarEntryKind; className?: string }) {
  return <span aria-hidden data-kind={kind} className={cn("inline-block shrink-0", markClasses[kind], className)} />;
}

export interface CalendarLegendProps {
  /** Arten mit ihrem Wort, zum Beispiel `{ kind: "confirmed", label: "Bestätigt" }`. */
  items: readonly { kind: CalendarEntryKind; label: string }[];
  /** Zugänglicher Name der Legende. */
  label: string;
  className?: string;
}

/** Legende zu den Marken der Monatsübersicht und den Formen der Einträge. */
export function CalendarLegend({ items, label, className }: CalendarLegendProps) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-x-4 gap-y-2 text-small text-ink-muted", className)}>
      {items.map((item) => (
        <li key={item.kind} className="flex items-center gap-2">
          <CalendarKindMark kind={item.kind} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface AvailabilityBadgeProps {
  /** Fertiger Text aus dem Kalender, zum Beispiel «Heute verfügbar» oder «Heute 14–22 Uhr». */
  label: ReactNode;
  /** Ersetzt das Uhr-Icon. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Verfügbarkeit als Icon und Wort, neutral. Erscheint nur, wenn der Kalender
 * sie deckt: Die Ansicht lässt die Komponente sonst weg.
 */
export function AvailabilityBadge({ label, icon, className }: AvailabilityBadgeProps) {
  return (
    <span className={cn("tabular inline-flex min-w-0 items-center gap-2 text-small text-ink [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted", className)}>
      <span aria-hidden className="contents">
        {icon ?? <Clock strokeWidth={1.5} />}
      </span>
      <span className="min-w-0">{label}</span>
    </span>
  );
}

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "../../cn";

export interface StatComparison {
  /** Zahl und Wort, zum Beispiel «+12 % ggü. Vorwoche». Der Text trägt die Aussage, das Icon begleitet ihn nur. */
  text: string;
  direction: "up" | "down" | "flat";
}

export interface StatFigureProps {
  /** Was gezählt wird, zum Beispiel «Profilaufrufe». */
  label: ReactNode;
  /** Fertig formatierter Wert, zum Beispiel «412». */
  value: string;
  comparison?: StatComparison;
  /** Zeitraum, zum Beispiel «Letzte 7 Tage». */
  period?: ReactNode;
  className?: string;
}

const directionIcons = { up: TrendingUp, down: TrendingDown, flat: Minus };

/**
 * Kennzahl mit Wert, Vergleich und Zeitraum (PRD 11.1). Keine Kachel: eine
 * Linie oben und Abstand trennen sie von der nächsten. Die Richtung ist nicht
 * gefärbt, weil «mehr» nicht bei jeder Zahl «besser» heisst.
 */
export function StatFigure({ label, value, comparison, period, className }: StatFigureProps) {
  const labelId = useId();
  const Icon = comparison ? directionIcons[comparison.direction] : null;
  return (
    <div role="group" aria-labelledby={labelId} className={cn("flex min-w-0 flex-col gap-1 border-t border-border pt-3 text-ink", className)}>
      <p id={labelId} className="text-small text-ink-muted">
        {label}
      </p>
      <p className="tabular text-h1">{value}</p>
      {comparison && Icon ? (
        <p data-direction={comparison.direction} className="tabular flex items-start gap-1 text-small">
          <Icon aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0 text-ink-muted" />
          <span>{comparison.text}</span>
        </p>
      ) : null}
      {period ? <p className="text-small text-ink-muted">{period}</p> : null}
    </div>
  );
}

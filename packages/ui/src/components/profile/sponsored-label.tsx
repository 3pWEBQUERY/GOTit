import { cn } from "../../cn";

export interface SponsoredLabelProps {
  /** Das Wort für bezahlte Platzierung, in der Regel «Anzeige». */
  label: string;
  className?: string;
}

/**
 * Kennzeichnet eine bezahlte Platzierung (PRD 3): immer als Wort, neutral in
 * Tinte auf Fläche mit Rand, nie nur über Farbe.
 */
export function SponsoredLabel({ label, className }: SponsoredLabelProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-chip border border-border-strong bg-surface px-2 py-1 text-label text-ink", className)}>{label}</span>
  );
}

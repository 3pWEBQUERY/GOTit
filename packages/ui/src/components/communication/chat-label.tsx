import { X } from "lucide-react";
import { cn } from "../../cn";

export interface ChatLabelProps {
  /** Frei benennbares, privates Label, zum Beispiel «Termin offen». */
  label: string;
  /** Macht das Label entfernbar. Braucht `removeLabel`. */
  onRemove?: () => void;
  /** Zugänglicher Name des Entfernen-Buttons, zum Beispiel «Label Termin offen entfernen». */
  removeLabel?: string;
  className?: string;
}

/** Kleines privates Label an einer Unterhaltung (PRD 11.4). Neutral, als Text. */
export function ChatLabel({ label, onRemove, removeLabel, className }: ChatLabelProps) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-chip border border-border bg-surface-2 px-2 py-1 text-label text-ink", className)}>
      <span className="min-w-0 truncate">{label}</span>
      {onRemove && removeLabel ? (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
          className="relative inline-flex size-4 shrink-0 items-center justify-center rounded-chip text-ink-muted transition-colors duration-state before:absolute before:-inset-3.5 hover:text-ink"
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      ) : null}
    </span>
  );
}

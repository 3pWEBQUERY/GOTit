import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "../../cn";

export interface MediaItem {
  key: string;
  /** Vom Anbieter gepflegter oder neutraler Alternativtext. */
  alt: string;
  /** Fehlt die Quelle, erscheint eine neutrale Fläche mit `initials`. */
  src?: string;
  /** Dominante Farbe des Bilds als CSS-Farbwert; füllt die Fläche, solange das Bild lädt. */
  placeholderColor?: string;
  initials?: string;
  /** Geschütztes Medium: Statt des Bilds steht die Bedingung als Text («Für angemeldete Mitglieder»). */
  locked?: { reason: string };
}

export interface MediaFrameProps {
  item: MediaItem;
  /** `cover` füllt die Fläche, `contain` zeigt das ganze Bild. */
  fit?: "cover" | "contain";
  /** Lädt das Bild sofort statt erst in Sichtweite. */
  eager?: boolean;
  className?: string;
}

/**
 * Inhalt einer Medienfläche. Geschützte Medien zeigen eine neutrale Fläche mit
 * der Bedingung, nie ein unscharfes Vorschaubild (PRD 10.1). Besteht aus
 * `span`-Elementen, damit sie auch in einem Button stehen darf.
 */
export function MediaFrame({ item, fit = "cover", eager, className }: MediaFrameProps) {
  const base = "flex size-full items-center justify-center overflow-hidden bg-surface-2";
  if (item.locked) {
    return (
      <span data-locked className={cn(base, "flex-col gap-2 p-4 text-center", className)}>
        <Lock aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
        <span className="text-small text-ink">{item.locked.reason}</span>
      </span>
    );
  }
  if (!item.src) {
    return (
      <span role="img" aria-label={item.alt} className={cn(base, className)}>
        <span aria-hidden className="text-h2 text-ink-muted select-none">
          {item.initials}
        </span>
      </span>
    );
  }
  // Einzige Inline-Farbe: Sie ist ein Datenwert des Bilds, kein Gestaltungswert.
  const style: CSSProperties | undefined = item.placeholderColor ? { backgroundColor: item.placeholderColor } : undefined;
  return (
    <span className={cn(base, className)} style={style}>
      <img
        src={item.src}
        alt={item.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
      />
    </span>
  );
}

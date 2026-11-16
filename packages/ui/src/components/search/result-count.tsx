import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface ResultCountProps {
  /** Fertiger Text, zum Beispiel «48 Profile in Beispielstadt». Anzeigen zählen nicht mit. */
  children: ReactNode;
  /** `h1` auf der Suchseite des Desktops, sonst ein Absatz. */
  as?: "p" | "h1" | "h2";
  className?: string;
}

/**
 * Trefferzahl der Suche. Der Text steht in einer Live-Region und wird bei
 * jeder Änderung angesagt; die Überschrift behält dabei ihre Rolle.
 */
export function ResultCount({ children, as: Element = "p", className }: ResultCountProps) {
  return (
    <Element className={cn("tabular text-ink", Element === "p" ? "text-small" : Element === "h1" ? "text-h1" : "text-h2", className)}>
      <span role="status" aria-live="polite" aria-atomic="true">
        {children}
      </span>
    </Element>
  );
}

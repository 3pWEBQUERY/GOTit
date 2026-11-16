import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface FieldMessageProps {
  id: string;
  /** `hint` erklärt das Format, `error` sagt, was nicht stimmt (Icon und Text, nie nur Farbe). */
  kind: "hint" | "error";
  children: ReactNode;
  className?: string;
}

/** Zeile unter einem Feld: Format-Hinweis oder Fehlermeldung. */
export function FieldMessage({ id, kind, children, className }: FieldMessageProps) {
  if (kind === "hint") {
    return (
      <p id={id} className={cn("text-small text-ink-muted", className)}>
        {children}
      </p>
    );
  }
  return (
    <p id={id} className={cn("flex items-start gap-1 text-small text-error", className)}>
      <CircleAlert aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0" />
      <span>{children}</span>
    </p>
  );
}

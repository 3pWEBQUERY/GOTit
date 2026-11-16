import { SlidersHorizontal } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";

export interface FilterBarButtonProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  /** Sichtbarer Text, zum Beispiel «Filter». */
  children: ReactNode;
  /** Anzahl aktiver Filter. Bei 0 oder ohne Angabe steht keine Zahl. */
  count?: number;
  /** Zugänglicher Name samt Anzahl, zum Beispiel «Filter anzeigen, 2 aktiv». Ohne Angabe gelten Text und Zahl, getrennt durch ein Leerzeichen. */
  accessibleLabel?: string;
}

/** Führender Button der Chip-Leiste: öffnet die Filter und nennt, wie viele aktiv sind. */
export function FilterBarButton({ children, count, accessibleLabel, className, type, ...props }: FilterBarButtonProps) {
  const name = accessibleLabel ?? (count && typeof children === "string" ? `${children} ${count}` : undefined);
  return (
    <button
      type={type ?? "button"}
      aria-label={name}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 text-small font-[550] whitespace-nowrap text-ink select-none",
        "transition-colors duration-state hover:bg-surface-2 active:bg-border disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <SlidersHorizontal aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" />
      <span>{children}</span>
      {count ? <span className="tabular min-w-6 rounded-full bg-ink px-2 py-1 text-center text-label text-bg">{count}</span> : null}
    </button>
  );
}

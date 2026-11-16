import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";

/** Klassen für das native Eingabeelement innerhalb von `ControlFrame`. */
export const controlInputClass = cn(
  "min-h-11 w-full min-w-0 flex-1 bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-muted",
  "disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none",
);

/** Klassen für Bedienelemente, die selbst den Rahmen tragen (Textbereich, Auslöser einer Auswahl). */
export const controlBoxClass = cn(
  "min-h-11 w-full rounded-control border border-border-strong bg-surface text-body text-ink transition-colors duration-state",
  "placeholder:text-ink-muted hover:border-ink aria-invalid:border-error",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-55 disabled:hover:border-border-strong",
);

export interface ControlFrameProps extends Omit<ComponentPropsWithRef<"div">, "prefix"> {
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Inhalt vor der Eingabe, zum Beispiel ein Icon oder «CHF». */
  prefix?: ReactNode;
  /** Inhalt nach der Eingabe, zum Beispiel eine Einheit oder ein Icon-Button. */
  suffix?: ReactNode;
}

/**
 * Sichtbarer Rahmen eines einzeiligen Felds. Der Fokusring liegt auf dem Rahmen,
 * damit Präfix und Suffix zum Feld gehören.
 */
export function ControlFrame({ invalid, disabled, readOnly, prefix, suffix, className, children, ...props }: ControlFrameProps) {
  return (
    <div
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "flex min-h-11 w-full min-w-0 items-center rounded-control border border-border-strong bg-surface text-ink transition-colors duration-state",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent",
        !disabled && !invalid && "hover:border-ink",
        invalid && "border-error",
        readOnly && "bg-surface-2",
        disabled && "cursor-not-allowed bg-surface-2 opacity-55",
        className,
      )}
      {...props}
    >
      {prefix ? <span className="flex shrink-0 items-center pl-3 text-ink-muted [&_svg]:size-5">{prefix}</span> : null}
      {children}
      {suffix ? <span className="flex shrink-0 items-center text-ink-muted [&_svg]:size-5">{suffix}</span> : null}
    </div>
  );
}

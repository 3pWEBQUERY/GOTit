import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

interface FloatingActionOwnProps {
  /** Beschriftung. Bei `iconOnly` ist sie der zugängliche Name. */
  label: string;
  icon: ReactNode;
  /** Zeigt nur das Icon; die Beschriftung bleibt als Name erhalten. */
  iconOnly?: boolean;
  /** `primary` ist die eine getönte Aktion der Ansicht. */
  variant?: "neutral" | "primary";
  className?: string;
}

export type FloatingActionProps = FloatingActionOwnProps &
  (
    | ({ href?: undefined } & Omit<ComponentPropsWithRef<"button">, "children" | "aria-label" | "className">)
    | ({ href: string } & Omit<ComponentPropsWithRef<"a">, "children" | "aria-label" | "className" | "href">)
  );

/**
 * Schwebende, kontextabhängige Aktion der mobilen Shell (Filter, Kontakt, Neu).
 * Sie ist Glas und positioniert sich nicht selbst: Die Ansicht setzt die Lage
 * über `className` und achtet darauf, dass höchstens drei Glasflächen sichtbar sind.
 */
export function FloatingAction({ label, icon, iconOnly, variant = "neutral", className, ...props }: FloatingActionProps) {
  const classes = cn(
    "glass inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full text-small font-[550] select-none",
    "transition-transform duration-state active:scale-95 disabled:cursor-not-allowed disabled:opacity-55",
    "[&_svg]:size-5 [&_svg]:shrink-0",
    variant === "primary" ? "glass-accent" : "text-ink",
    iconOnly ? "px-0" : "px-4",
    className,
  );
  const content = (
    <>
      <span aria-hidden className="contents">
        {icon}
      </span>
      {iconOnly ? null : <span className="text-center">{label}</span>}
    </>
  );
  const name = iconOnly ? { "aria-label": label, title: label } : {};

  if (props.href !== undefined) {
    return (
      <UiLink className={classes} {...name} {...props}>
        {content}
      </UiLink>
    );
  }
  const { type, ...buttonProps } = props;
  return (
    <button type={type ?? "button"} className={classes} {...name} {...buttonProps}>
      {content}
    </button>
  );
}

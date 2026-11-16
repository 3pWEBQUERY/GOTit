"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { Button, buttonVariants } from "./button";
import { Menu, MenuContent, MenuTrigger } from "./menu";

export interface SplitButtonProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  /** Beschriftung der Hauptaktion, als Verb + Objekt. */
  children: ReactNode;
  /** Zugänglicher Name des Pfeils, der die weiteren Aktionen öffnet. */
  menuLabel: string;
  /** Die weiteren Aktionen als `MenuItem`. */
  menu: ReactNode;
  variant?: "primary" | "secondary";
  loading?: boolean;
  icon?: ReactNode;
  width?: "auto" | "full";
}

/**
 * Hauptaktion mit einem Pfeil für verwandte Aktionen («Entwurf speichern» mit
 * «Speichern und schliessen»). Beide Teile sind eigene Tastaturziele.
 */
export function SplitButton({ children, menuLabel, menu, variant = "secondary", loading, icon, width, disabled, className, ...props }: SplitButtonProps) {
  return (
    <div role="group" className={cn("inline-flex", width === "full" && "flex w-full", className)}>
      <Button
        variant={variant}
        loading={loading}
        icon={icon}
        disabled={disabled}
        className={cn("min-w-0 rounded-r-none", width === "full" && "flex-1")}
        {...props}
      >
        {children}
      </Button>
      <Menu>
        <MenuTrigger
          aria-label={menuLabel}
          title={menuLabel}
          disabled={disabled || loading}
          className={cn(
            buttonVariants({ variant }),
            "w-11 shrink-0 rounded-l-none px-0 data-[state=open]:[&_svg]:rotate-180 [&_svg]:transition-transform [&_svg]:duration-state",
            variant === "primary" ? "border-l-on-accent/30" : "-ml-px",
          )}
        >
          <ChevronDown aria-hidden strokeWidth={1.5} />
        </MenuTrigger>
        <MenuContent align="end">{menu}</MenuContent>
      </Menu>
    </div>
  );
}

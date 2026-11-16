"use client";

import { Check } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";

const itemClasses = [
  "flex min-h-11 cursor-default items-center gap-3 rounded-chip px-3 py-2 text-small text-ink select-none",
  "transition-colors duration-state data-highlighted:bg-surface-2",
  "data-disabled:cursor-not-allowed data-disabled:opacity-55",
  "[&_svg]:size-[1.125rem] [&_svg]:shrink-0",
];

/** Menü weiterer Aktionen. Öffnet per Klick, Enter, Leertaste oder Pfeil nach unten. */
export const Menu = MenuPrimitive.Root;

/** Auslöser des Menüs. Mit `asChild` wird ein Button oder IconButton zum Auslöser. */
export const MenuTrigger = MenuPrimitive.Trigger;

export type MenuContentProps = ComponentPropsWithRef<typeof MenuPrimitive.Content>;

/** Fläche des Menüs: erhöhte Ebene, schliesst mit Escape und gibt den Fokus an den Auslöser zurück. */
export function MenuContent({ className, sideOffset = 4, align = "start", collisionPadding = 8, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) min-w-48 overflow-y-auto",
          "animate-layer-in rounded-control border border-border bg-surface p-1 text-ink shadow-raised",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export interface MenuItemProps extends ComponentPropsWithRef<typeof MenuPrimitive.Item> {
  /** Kennzeichnet eine Aktion, die etwas entfernt oder beendet. */
  destructive?: boolean;
  /** Icon vor dem Text. Mit `asChild` gehört das Icon in das Kind. */
  icon?: ReactNode;
}

/** Eintrag des Menüs. Mit `asChild` wird ein `UiLink` zum Eintrag. */
export function MenuItem({ destructive, icon, asChild, className, children, ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item asChild={asChild} className={cn(itemClasses, destructive && "text-error", className)} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          <span className="min-w-0 flex-1">{children}</span>
        </>
      )}
    </MenuPrimitive.Item>
  );
}

export type MenuCheckboxItemProps = ComponentPropsWithRef<typeof MenuPrimitive.CheckboxItem>;

/** Eintrag zum An- und Abwählen. Das Menü bleibt nach der Wahl geschlossen wie bei jeder Aktion. */
export function MenuCheckboxItem({ className, children, ...props }: MenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemClasses, className)} {...props}>
      <span className="flex size-[1.125rem] shrink-0 items-center justify-center">
        <MenuPrimitive.ItemIndicator>
          <Check aria-hidden strokeWidth={1.5} />
        </MenuPrimitive.ItemIndicator>
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

/** Überschrift einer Gruppe von Einträgen. */
export function MenuLabel({ className, ...props }: ComponentPropsWithRef<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn("px-3 py-2 text-label text-ink-muted", className)} {...props} />;
}

/** Linie zwischen Gruppen von Einträgen. */
export function MenuSeparator({ className, ...props }: ComponentPropsWithRef<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

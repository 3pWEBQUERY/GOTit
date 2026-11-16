"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";

/** Einmal um die App legen. Regelt die Verzögerung, mit der Tooltips erscheinen. */
export function TooltipProvider({ delayDuration = 400, ...props }: ComponentPropsWithRef<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export interface TooltipProps extends Omit<ComponentPropsWithRef<typeof TooltipPrimitive.Content>, "content" | "children"> {
  /** Kurzer Zusatz, zum Beispiel das genaue Datum zu «vor 3 Tagen». */
  content: ReactNode;
  /** Der Auslöser: genau ein fokussierbares Element. */
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Zusatzinformation bei Hover und Fokus. Nie die einzige Quelle einer Information,
 * die zum Bedienen nötig ist: Auf Touch-Geräten gibt es keinen Hover.
 */
export function Tooltip({ content, children, open, defaultOpen, onOpenChange, className, sideOffset = 6, collisionPadding = 8, ...props }: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn("z-50 max-w-64 animate-fade-in rounded-chip bg-ink px-2 py-1 text-label text-bg shadow-raised", className)}
          {...props}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

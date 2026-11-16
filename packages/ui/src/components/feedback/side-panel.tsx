"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";

/** Seitenpanel für «Bearbeiten im Kontext»: Die Liste dahinter bleibt sichtbar. */
export const SidePanel = DialogPrimitive.Root;

export const SidePanelTrigger = DialogPrimitive.Trigger;

export const SidePanelClose = DialogPrimitive.Close;

export interface SidePanelContentProps extends Omit<ComponentPropsWithRef<typeof DialogPrimitive.Content>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Zugänglicher Name des Schliessen-Buttons. */
  closeLabel: string;
  /** Haftender Fuss, zum Beispiel «Änderungen speichern» und «Abbrechen». */
  footer?: ReactNode;
}

/**
 * Fläche des Panels: von rechts, volle Höhe, höchstens 480 px breit. Der Körper
 * scrollt, Kopf und Fuss bleiben stehen. Bei ungespeicherten Eingaben fängt die
 * Ansicht das Schliessen über `onEscapeKeyDown` und `onInteractOutside` ab.
 */
export function SidePanelContent({ title, description, closeLabel, footer, className, children, ...props }: SidePanelContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-ink/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-panel animate-panel-in flex-col border-l border-border bg-surface text-ink shadow-floating",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border py-2 pr-2 pl-4 md:pl-6">
          <div className="flex min-w-0 flex-col gap-1 py-2">
            <DialogPrimitive.Title className="text-h3">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-small text-ink-muted">{description}</DialogPrimitive.Description> : null}
          </div>
          <DialogPrimitive.Close asChild>
            <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} />
          </DialogPrimitive.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] xs:flex-row xs:justify-end md:px-6">
            {footer}
          </footer>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

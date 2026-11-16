"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";

/** Abdunklung hinter Dialogen; sie trägt und zentriert die Fläche und scrollt, wenn der Dialog höher ist als der Bildschirm. */
export const dialogOverlayClasses = "fixed inset-0 z-50 grid animate-fade-in place-items-center overflow-y-auto bg-ink/40 p-4";

export const dialogSurfaceClasses = "relative w-full max-w-panel animate-layer-in rounded-card bg-surface p-4 text-ink shadow-floating md:p-6";

/** Dialog für kurze Entscheidungen. Für Bearbeiten im Kontext gibt es `SidePanel`, für mehr als etwa sieben Felder eine eigene Seite. */
export const Dialog = DialogPrimitive.Root;

export const DialogTrigger = DialogPrimitive.Trigger;

/** Schliesst den Dialog. Mit `asChild` wird ein Button zum Schliessen-Element. */
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps extends Omit<ComponentPropsWithRef<typeof DialogPrimitive.Content>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Zugänglicher Name des Schliessen-Buttons. */
  closeLabel: string;
}

/** Fläche des Dialogs. Der Fokus ist gefangen und kehrt zum Auslöser zurück; Escape schliesst. */
export function DialogContent({ title, description, closeLabel, className, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={dialogOverlayClasses}>
        <DialogPrimitive.Content
          className={cn(dialogSurfaceClasses, className)}
          {...(description ? {} : { "aria-describedby": undefined })}
          {...props}
        >
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="min-w-0 py-2 text-h3">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} className="-mt-1 -mr-2" />
            </DialogPrimitive.Close>
          </div>
          {description ? <DialogPrimitive.Description className="text-small text-ink-muted">{description}</DialogPrimitive.Description> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}

/** Aktionen am Fuss: untereinander auf schmalen Bildschirmen, sonst rechtsbündig. Die wichtigste Aktion steht zuletzt. */
export function DialogFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 xs:flex-row xs:justify-end", className)} {...props} />;
}

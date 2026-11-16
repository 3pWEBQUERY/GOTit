"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { DialogFooter, dialogOverlayClasses, dialogSurfaceClasses } from "./dialog";

export interface ConfirmDialogProps {
  /** Der Auslöser, genau ein Button. Entfällt bei gesteuertem `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Die Frage in Klartext: «Dieses Medium endgültig löschen?» */
  title: ReactNode;
  /** Benennt die Folge: was verloren geht und dass es nicht umkehrbar ist. */
  description: ReactNode;
  /** Verb + Objekt, zum Beispiel «Medium löschen». */
  confirmLabel: string;
  cancelLabel: string;
  /**
   * Führt die Aktion aus. Gibt sie ein Promise zurück, zeigt der Button den
   * Ladezustand; der Dialog schliesst nach Erfolg und bleibt bei einem Fehler offen.
   */
  onConfirm: () => void | Promise<void>;
  /** Zusätzlicher Inhalt, zum Beispiel ein `InlineAlert`, wenn das Löschen fehlschlug. */
  children?: ReactNode;
  className?: string;
}

/**
 * Rückfrage vor einer nicht umkehrbaren Aktion (PRD 13). Umkehrbares geschieht
 * ohne Rückfrage und bietet «Rückgängig» im Toast. Der Fokus startet auf «Abbrechen».
 */
export function ConfirmDialog({ trigger, open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, children, className }: ConfirmDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isOpen = open ?? innerOpen;

  function setOpen(next: boolean) {
    if (pending && !next) return;
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function confirm() {
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      setOpen(false);
      return;
    }
    setPending(true);
    result.then(
      () => {
        setPending(false);
        if (open === undefined) setInnerOpen(false);
        onOpenChange?.(false);
      },
      () => setPending(false),
    );
  }

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      {trigger ? <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger> : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={dialogOverlayClasses}>
          <AlertDialogPrimitive.Content className={cn(dialogSurfaceClasses, className)}>
            <AlertDialogPrimitive.Title className="text-h3">{title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-small text-ink-muted">{description}</AlertDialogPrimitive.Description>
            {children ? <div className="mt-4">{children}</div> : null}
            <DialogFooter>
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary" disabled={pending}>
                  {cancelLabel}
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button variant="destructive" loading={pending} onClick={confirm}>
                {confirmLabel}
              </Button>
            </DialogFooter>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Overlay>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

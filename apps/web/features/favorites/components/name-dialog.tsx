"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  InlineAlert,
  TextField,
} from "@app/ui";
import { useId, useState, type FormEvent, type ReactNode } from "react";

/** Ergebnis des Speicherns: Fehler am Feld oder für das Formular, jeweils als fertiger Text. */
export type NameSubmitResult =
  | { ok: true }
  | { ok: false; fieldError?: string; formError?: string };

export interface NameDialogProps {
  /** Genau ein Button; öffnet den Dialog. Entfällt bei gesteuertem `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  label: string;
  hint: string;
  submitLabel: string;
  cancelLabel: string;
  closeLabel: string;
  initial?: string;
  maxLength: number;
  /** Text, wenn das Speichern ohne Antwort scheitert (zum Beispiel ohne Netz). */
  genericError: string;
  /** Speichert den Namen. Bei Erfolg schliesst der Dialog. */
  onSubmit: (name: string) => Promise<NameSubmitResult>;
}

/**
 * Ein Feld «Name» mit Speichern-Button im Dialog: für neue Sammlungen und
 * zum Umbenennen von Sammlungen und Suchen. Fehler stehen am Feld, der Fokus
 * kehrt dorthin zurück; Escape oder «Abbrechen» verwerfen die Eingabe.
 */
export function NameDialog({
  trigger,
  open,
  onOpenChange,
  title,
  label,
  hint,
  submitLabel,
  cancelLabel,
  closeLabel,
  initial = "",
  maxLength,
  genericError,
  onSubmit,
}: NameDialogProps) {
  const id = useId();
  const [innerOpen, setInnerOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isOpen = open ?? innerOpen;

  // Beim Öffnen frisch beginnen, auch wenn der Dialog von aussen geöffnet wird.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setValue(initial);
      setFieldError(null);
      setFormError(null);
    }
  }

  function setOpen(next: boolean) {
    if (pending) return;
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    const result = await onSubmit(value).catch(
      (): NameSubmitResult => ({ ok: false, formError: genericError }),
    );
    setPending(false);
    if (result.ok) {
      if (open === undefined) setInnerOpen(false);
      onOpenChange?.(false);
      return;
    }
    setFieldError(result.fieldError ?? null);
    setFormError(result.formError ?? null);
    if (result.fieldError)
      requestAnimationFrame(() =>
        document.getElementById(`${id}-name`)?.focus(),
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent title={title} closeLabel={closeLabel}>
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4"
        >
          {formError ? <InlineAlert tone="error" title={formError} /> : null}
          <TextField
            id={`${id}-name`}
            name="name"
            label={label}
            hint={hint}
            value={value}
            maxLength={maxLength + 20}
            autoComplete="off"
            error={fieldError ?? undefined}
            onChange={(event) => setValue(event.target.value)}
          />
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  InlineAlert,
  RadioGroup,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export interface MoveDialogProps {
  /** Anzahl der Einträge, die verschoben werden; 0 schliesst den Dialog. */
  count: number;
  targets: readonly { id: string; name: string }[];
  onClose: () => void;
  /** Verschiebt; ein Fehlertext lässt den Dialog offen. */
  onMove: (targetId: string) => Promise<string | null>;
}

/** «In Sammlung verschieben»: Ziel wählen, dann «Verschieben». Hier entfernt, im Ziel oben (PRD v2 12.1). */
export function MoveDialog({
  count,
  targets,
  onClose,
  onMove,
}: MoveDialogProps) {
  const t = useTranslations("favorites.moveDialog");
  const [target, setTarget] = useState<string>("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const open = count > 0;
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTarget("");
      setFieldError(null);
      setFormError(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) {
      setFieldError(t("required"));
      return;
    }
    setPending(true);
    const error = await onMove(target);
    setPending(false);
    setFormError(error);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        title={t("title")}
        description={t("description", { count })}
        closeLabel={t("close")}
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4"
        >
          {formError ? <InlineAlert tone="error" title={formError} /> : null}
          <RadioGroup
            label={t("label")}
            options={targets.map((collection) => ({
              value: collection.id,
              label: collection.name,
            }))}
            value={target}
            error={fieldError ?? undefined}
            onValueChange={(value) => {
              setTarget(value);
              setFieldError(null);
            }}
          />
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={pending}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={pending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

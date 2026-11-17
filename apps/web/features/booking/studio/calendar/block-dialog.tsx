"use client";

import { NOTE_MAX } from "@app/core/booking/schemas";
import {
  Button,
  DateField,
  Dialog,
  DialogContent,
  DialogFooter,
  InlineAlert,
  RadioGroup,
  TextArea,
  TimeField,
  useToast,
} from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  addBlockAction,
  type BlockField,
  type BlockInput,
  type BlockResult,
} from "../actions/calendar";
import { useFieldLabels } from "../lib/use-labels";

export interface BlockDraft {
  kind: BlockInput["kind"];
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
}

type Errors = Partial<Record<BlockField, string>>;

/** Prüft die Eingaben wie der Server, damit Fehler sofort am Feld stehen. */
export function validateBlock(
  draft: BlockDraft,
): Partial<Record<BlockField, "required" | "time" | "endBeforeStart">> {
  const errors: Partial<
    Record<BlockField, "required" | "time" | "endBeforeStart">
  > = {};
  if (!draft.startDay) errors.startDay = "required";
  if (!draft.endDay) errors.endDay = "required";
  const whole = draft.kind === "ABSENCE";
  if (!whole && !draft.startTime) errors.startTime = "time";
  if (!whole && !draft.endTime) errors.endTime = "time";
  if (Object.keys(errors).length > 0) return errors;
  const start = whole ? draft.startDay : `${draft.startDay}T${draft.startTime}`;
  const end = whole ? draft.endDay : `${draft.endDay}T${draft.endTime}`;
  if (whole ? end < start : end <= start)
    errors[whole ? "endDay" : "endTime"] = "endBeforeStart";
  return errors;
}

/**
 * «+ Blocker» (v1 FR-BOOKING-001: Abwesenheiten, manuelle Blockierungen,
 * private Notizen). Blocker gelten stundenweise, Abwesenheiten für ganze Tage
 * in der Zone des Kalenders. Dialog, weil es eine kurze Eingabe ist (PRD 13).
 */
export function BlockDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: BlockDraft;
}) {
  const t = useTranslations("bookingStudio.block");
  const locale = useLocale();
  const labels = useFieldLabels();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState(initial);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const whole = draft.kind === "ABSENCE";
  const set = (patch: Partial<BlockDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validateBlock(draft);
    const messages: Errors = Object.fromEntries(
      Object.entries(found).map(([field, code]) => [
        field,
        t(`errors.${code}`),
      ]),
    );
    setErrors(messages);
    setFailed(false);
    if (Object.keys(messages).length > 0) {
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    setPending(true);
    const result = await addBlockAction({ ...draft, note }).catch(
      (): BlockResult => ({ ok: false, reason: "failed" }),
    );
    setPending(false);
    if (!result.ok) {
      if (result.field)
        setErrors({
          [result.field]: t(
            result.reason === "end-before-start"
              ? "errors.endBeforeStart"
              : result.field.endsWith("Time")
                ? "errors.time"
                : "errors.required",
          ),
        });
      else setFailed(true);
      return;
    }
    toast({ title: t(whole ? "savedAbsence" : "saved"), tone: "success" });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}
    >
      <DialogContent
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        closeLabel={t("close")}
        data-block-dialog
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4"
        >
          <RadioGroup
            label={t("kind")}
            value={draft.kind}
            onValueChange={(kind) => {
              set({ kind: kind as BlockDraft["kind"] });
              setErrors({});
            }}
            options={[
              {
                value: "BLOCKER",
                label: t("kindBlocker"),
                description: t("kindBlockerHint"),
              },
              {
                value: "ABSENCE",
                label: t("kindAbsence"),
                description: t("kindAbsenceHint"),
              },
            ]}
          />
          <div className="grid gap-4 xs:grid-cols-2">
            <DateField
              label={whole ? t("firstDay") : t("startDay")}
              locale={`${locale}-CH`}
              labels={labels.date}
              value={draft.startDay || null}
              onValueChange={(value) => set({ startDay: value ?? "" })}
              error={errors.startDay}
            />
            {whole ? null : (
              <TimeField
                label={t("startTime")}
                labels={labels.time}
                value={draft.startTime || null}
                onValueChange={(value) => set({ startTime: value ?? "" })}
                error={errors.startTime}
                placeholder={labels.placeholderTime}
              />
            )}
            <DateField
              label={whole ? t("lastDay") : t("endDay")}
              locale={`${locale}-CH`}
              labels={labels.date}
              value={draft.endDay || null}
              onValueChange={(value) => set({ endDay: value ?? "" })}
              error={errors.endDay}
            />
            {whole ? null : (
              <TimeField
                label={t("endTime")}
                labels={labels.time}
                value={draft.endTime || null}
                onValueChange={(value) => set({ endTime: value ?? "" })}
                error={errors.endTime}
                placeholder={labels.placeholderTime}
              />
            )}
          </div>
          <TextArea
            label={t("note")}
            hint={t("noteHint")}
            optionalLabel={t("optional")}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.currentTarget.value)}
            error={errors.note}
            autoGrow
          />
          {failed ? (
            <InlineAlert tone="error" title={t("errors.failed")} />
          ) : null}
          <DialogFooter className="mt-2">
            <Button disabled={pending} onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {whole ? t("saveAbsence") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

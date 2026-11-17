"use client";

import {
  Button,
  ConfirmDialog,
  DateField,
  EmptyState,
  InlineAlert,
  RadioGroup,
  TextField,
  TimeField,
  useToast,
} from "@app/ui";
import { CalendarOff, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useFieldLabels } from "../../booking/studio/lib/use-labels";
import {
  deleteExceptionAction,
  saveExceptionAction,
} from "../actions/locations";
import {
  exceptionErrors,
  toExceptionInput,
  type ExceptionDraft,
} from "../lib/exceptions";

export interface ExceptionView {
  id: string;
  /** Tag als TT.MM.JJJJ mit Wochentag. */
  dayLabel: string;
  /** «Geschlossen» oder die Zeiten. */
  hoursLabel: string;
  note: string | null;
}

const EMPTY: ExceptionDraft = {
  day: "",
  closed: true,
  from: "",
  to: "",
  note: "",
};

/** Ausnahmen an einzelnen Tagen (v2 12.2): geschlossen oder andere Zeiten, mit Notiz; Entfernen nach Rückfrage. */
export function ExceptionsSection({
  slug,
  locationId,
  exceptions,
  canEdit,
  today,
}: {
  slug: string;
  locationId: string;
  exceptions: readonly ExceptionView[];
  canEdit: boolean;
  today: string;
}) {
  const t = useTranslations("organization.exceptions");
  const tForm = useTranslations("organization.form");
  const labels = useFieldLabels();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ExceptionDraft, string>>
  >({});
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const set = (patch: Partial<ExceptionDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    const found = exceptionErrors(draft);
    setErrors(
      Object.fromEntries(
        Object.entries(found).map(([field, code]) => [
          field,
          t(`errors.${code}`),
        ]),
      ),
    );
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus(),
      );
      return;
    }
    setPending(true);
    const result = await saveExceptionAction(
      slug,
      locationId,
      toExceptionInput(draft),
    ).catch(() => ({ ok: false as const }));
    setPending(false);
    if (!result.ok) return setFailed(true);
    toast({ title: t("saved"), tone: "success" });
    setDraft(EMPTY);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <ExceptionList slug={slug} exceptions={exceptions} canEdit={canEdit} />
      {canEdit ? (
        <form
          ref={form}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex max-w-reading flex-col gap-4 rounded-card border border-border p-4"
          data-exception-form
        >
          <h3 className="text-h3">{t("addTitle")}</h3>
          <DateField
            id="ausnahme-tag"
            label={t("day")}
            hint={t("dayHint")}
            locale={`${locale}-CH`}
            labels={labels.date}
            min={today}
            today={today}
            value={draft.day || null}
            onValueChange={(value) => set({ day: value ?? "" })}
            error={errors.day}
          />
          <RadioGroup
            label={t("kind")}
            value={draft.closed ? "closed" : "hours"}
            onValueChange={(value) => set({ closed: value === "closed" })}
            options={[
              { value: "closed", label: t("closed") },
              { value: "hours", label: t("otherHours") },
            ]}
          />
          {draft.closed ? null : (
            <div className="grid gap-4 xs:grid-cols-2">
              <TimeField
                label={t("from")}
                labels={labels.time}
                placeholder={labels.placeholderTime}
                value={draft.from || null}
                onValueChange={(value) => set({ from: value ?? "" })}
                error={errors.from}
              />
              <TimeField
                label={t("to")}
                labels={labels.time}
                placeholder={labels.placeholderTime}
                value={draft.to || null}
                onValueChange={(value) => set({ to: value ?? "" })}
                error={errors.to}
              />
            </div>
          )}
          <TextField
            label={t("note")}
            hint={t("noteHint")}
            optionalLabel={tForm("optional")}
            maxLength={200}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
          {failed ? (
            <InlineAlert tone="error" title={t("failed")}>
              {tForm("nothingLost")}
            </InlineAlert>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            className="self-start"
          >
            {t("save")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Eingetragene Ausnahmen; Entfernen nach Rückfrage, die die Folge benennt (PRD 13). */
function ExceptionList({
  slug,
  exceptions,
  canEdit,
}: {
  slug: string;
  exceptions: readonly ExceptionView[];
  canEdit: boolean;
}) {
  const t = useTranslations("organization.exceptions");
  const router = useRouter();
  const { toast } = useToast();
  const [removeFailed, setRemoveFailed] = useState(false);

  async function remove(id: string) {
    setRemoveFailed(false);
    const result = await deleteExceptionAction(slug, id).catch(() => ({
      ok: false as const,
    }));
    if (!result.ok) {
      setRemoveFailed(true);
      throw new Error("remove-failed");
    }
    toast({ title: t("removed"), tone: "success" });
    router.refresh();
  }

  return (
    <>
      {exceptions.length === 0 ? (
        <EmptyState
          icon={<CalendarOff strokeWidth={1.5} />}
          title={t("empty")}
          className="py-2"
        />
      ) : (
        <ul
          aria-label={t("listLabel")}
          className="flex flex-col divide-y divide-border border-y border-border"
          data-exception-list
        >
          {exceptions.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 py-3 xs:flex-row xs:items-start xs:justify-between"
              data-exception-row={entry.id}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-body text-ink">
                  <span className="tabular font-[550]">{entry.dayLabel}</span>
                  <span aria-hidden> · </span>
                  <span className="sr-only">, </span>
                  <span className="tabular">{entry.hoursLabel}</span>
                </p>
                {entry.note ? (
                  <p className="text-small break-words text-ink-muted">
                    {entry.note}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="quiet"
                      icon={<Trash2 aria-hidden strokeWidth={1.5} />}
                      className="self-start"
                    >
                      {t("remove", { day: entry.dayLabel })}
                    </Button>
                  }
                  title={t("removeTitle", { day: entry.dayLabel })}
                  description={t("removeDescription")}
                  confirmLabel={t("removeConfirm")}
                  cancelLabel={t("cancel")}
                  onConfirm={() => remove(entry.id)}
                >
                  {removeFailed ? (
                    <InlineAlert tone="error" title={t("removeFailed")} />
                  ) : null}
                </ConfirmDialog>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

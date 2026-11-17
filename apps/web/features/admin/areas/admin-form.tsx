"use client";

import { Button, Checkbox, CheckboxGroup, ConfirmDialog, DateField, InlineAlert, RadioGroup, Select, TextArea, TextField, useToast } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "../../account/action-result";

export type FormValue = string | boolean | string[];
export type FormValues = Record<string, FormValue>;

interface FieldBase {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
}
export type AdminFieldSpec =
  | (FieldBase & { kind: "text"; type?: "text" | "email" | "number"; defaultValue?: string; minLength?: number; maxLength?: number; inputMode?: "numeric" })
  | (FieldBase & { kind: "textarea"; defaultValue?: string; minLength?: number; maxLength?: number; rows?: number })
  | (FieldBase & { kind: "select"; options: { value: string; label: string }[]; defaultValue?: string; placeholder?: string })
  | (FieldBase & { kind: "radio"; options: { value: string; label: string; description?: string }[]; defaultValue?: string })
  | (FieldBase & { kind: "checkbox"; description?: string; defaultChecked?: boolean })
  | (FieldBase & { kind: "checkboxes"; options: { value: string; label: string }[]; defaultValues?: string[] })
  | (FieldBase & { kind: "date"; defaultValue?: string; min?: string });

export interface AdminFormConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface AdminFormProps {
  /** Server Action; Fehler sind Schlüssel unter `adminCommon.errors`. `redirectTo` führt nach Erfolg weiter. */
  action: (values: FormValues) => Promise<ActionResult<{ redirectTo?: string } | undefined>>;
  fields: readonly AdminFieldSpec[];
  submitLabel: string;
  submitVariant?: "primary" | "secondary" | "destructive";
  successMessage: string;
  /** Steht über den Feldern, zum Beispiel eine Warnung. */
  intro?: ReactNode;
  /** Rückfrage vor dem Absenden, für Schweres und nicht Umkehrbares (PRD 13). */
  confirm?: AdminFormConfirm;
  /** Leert die Felder nach Erfolg, zum Beispiel nach einer Antwort. */
  resetOnSuccess?: boolean;
  /** Kennung für Tests und Sprunglinks. */
  id?: string;
}

function initialValues(fields: readonly AdminFieldSpec[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.kind === "checkbox") values[field.name] = field.defaultChecked ?? false;
    else if (field.kind === "checkboxes") values[field.name] = field.defaultValues ?? [];
    else values[field.name] = field.defaultValue ?? "";
  }
  return values;
}

/**
 * Formular der Admin-Bereiche (PRD 13): Label über dem Feld, Hinweis darunter,
 * Prüfung beim Verlassen, Fehler am Feld und oben mit Sprunglinks, Fokus zum
 * ersten Fehler, Senden nie deaktiviert. Eingaben bleiben bei Fehlern stehen.
 */
export function AdminForm({ action, fields, submitLabel, submitVariant = "primary", successMessage, intro, confirm, resetOnSuccess, id }: AdminFormProps) {
  const t = useTranslations("adminCommon.form");
  const tError = useTranslations("adminCommon.errors");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const base = useId().replace(/:/g, "");
  const [values, setValues] = useState<FormValues>(() => initialValues(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generation, setGeneration] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldId = (name: string) => `${id ?? base}-${name}`;
  const spec = (name: string) => fields.find((field) => field.name === name);

  function errorText(name: string): string | undefined {
    const key = errors[name];
    if (!key) return undefined;
    const field = spec(name);
    const min = field && "minLength" in field ? (field.minLength ?? 10) : 10;
    const max = field && "maxLength" in field ? (field.maxLength ?? 500) : 500;
    return tError(key, { min, max });
  }

  function set(name: string, value: FormValue) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors(({ [name]: _removed, ...rest }) => rest);
  }

  function validateField(field: AdminFieldSpec, value: FormValue): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return field.optional ? null : "required";
    if ("minLength" in field && field.minLength && trimmed.length < field.minLength) return "tooShort";
    return null;
  }

  function blur(field: AdminFieldSpec) {
    const value = values[field.name] ?? "";
    // Leere Pflichtfelder meldet erst das Absenden; beim Verlassen nur zu Kurzes.
    if (typeof value === "string" && value.trim() === "") return;
    const problem = validateField(field, value);
    if (problem) setErrors((current) => ({ ...current, [field.name]: problem }));
  }

  function focusFirst(keys: string[]) {
    const first = fields.find((field) => keys.includes(field.name));
    if (!first) return;
    requestAnimationFrame(() => {
      const element = document.getElementById(fieldId(first.name));
      (element?.querySelector<HTMLElement>("[role=radio],[role=checkbox],input,textarea,button") ?? element)?.focus();
    });
  }

  async function send() {
    setPending(true);
    setFormError(null);
    const result = await action(values).catch((): ActionResult<undefined> => ({ ok: false, formError: "generic" }));
    setPending(false);
    if (result.ok) {
      toast({ title: successMessage, tone: "success" });
      setErrors({});
      if (resetOnSuccess) {
        setValues(initialValues(fields));
        setGeneration((value) => value + 1);
      }
      const target = result.data && typeof result.data === "object" ? result.data.redirectTo : undefined;
      if (target) router.push(target);
      else router.refresh();
      return;
    }
    const fieldErrors = result.fieldErrors ?? {};
    setErrors(fieldErrors);
    setFormError(result.formError ?? null);
    if (Object.keys(fieldErrors).length > 0) focusFirst(Object.keys(fieldErrors));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const local: Record<string, string> = {};
    for (const field of fields) {
      const problem = validateField(field, values[field.name] ?? "");
      if (problem) local[field.name] = problem;
    }
    if (Object.keys(local).length > 0) {
      setErrors(local);
      setFormError(null);
      focusFirst(Object.keys(local));
      return;
    }
    if (confirm) setConfirmOpen(true);
    else void send();
  }

  const summary = fields.filter((field) => errors[field.name]).map((field) => ({ id: fieldId(field.name), message: `${field.label}: ${errorText(field.name) ?? ""}` }));
  const optionalLabel = t("optional");

  function render(field: AdminFieldSpec) {
    const common = { label: field.label, hint: field.hint, error: errorText(field.name), optionalLabel: field.optional ? optionalLabel : undefined };
    const value = values[field.name];
    switch (field.kind) {
      case "text":
        return (
          <TextField
            {...common}
            id={fieldId(field.name)}
            name={field.name}
            type={field.type ?? "text"}
            inputMode={field.inputMode}
            maxLength={field.maxLength}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => set(field.name, event.target.value)}
            onBlur={() => blur(field)}
          />
        );
      case "textarea":
        return (
          <TextArea
            {...common}
            id={fieldId(field.name)}
            name={field.name}
            rows={field.rows ?? 4}
            maxLength={field.maxLength}
            countLabel={field.maxLength ? (used, max) => t("count", { used, max }) : undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => set(field.name, event.target.value)}
            onBlur={() => blur(field)}
          />
        );
      case "select":
        return (
          <Select
            {...common}
            id={fieldId(field.name)}
            name={field.name}
            placeholder={field.placeholder ?? t("choose")}
            options={field.options}
            value={typeof value === "string" && value ? value : undefined}
            onValueChange={(next) => set(field.name, next)}
          />
        );
      case "radio":
        return (
          <div id={fieldId(field.name)}>
            <RadioGroup {...common} name={fieldId(field.name)} options={field.options} value={typeof value === "string" ? value : ""} onValueChange={(next) => set(field.name, next)} />
          </div>
        );
      case "checkbox":
        return (
          <Checkbox
            id={fieldId(field.name)}
            name={field.name}
            label={field.label}
            description={field.description ?? field.hint}
            error={common.error}
            checked={value === true}
            onCheckedChange={(checked) => set(field.name, checked === true)}
          />
        );
      case "checkboxes": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div id={fieldId(field.name)}>
            <CheckboxGroup {...common}>
              <div className={field.options.length > 8 ? "grid sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col"}>
              {field.options.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) => set(field.name, checked === true ? [...selected, option.value] : selected.filter((entry) => entry !== option.value))}
                />
              ))}
              </div>
            </CheckboxGroup>
          </div>
        );
      }
      case "date":
        return (
          <DateField
            {...common}
            id={fieldId(field.name)}
            name={field.name}
            locale={`${locale}-CH`}
            placeholder="TT.MM.JJJJ"
            min={field.min}
            labels={{ openCalendar: t("calendar.open"), previousMonth: t("calendar.previous"), nextMonth: t("calendar.next"), invalidFormat: tError("dateInvalid"), outOfRange: tError("datePast") }}
            value={typeof value === "string" && value ? value : null}
            onValueChange={(next) => set(field.name, next ?? "")}
          />
        );
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex max-w-2xl flex-col gap-5" data-admin-form={id}>
      {summary.length > 0 ? (
        <InlineAlert tone="error" title={t("summaryTitle", { count: summary.length })}>
          <ul className="flex flex-col gap-1">
            {summary.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-ink underline underline-offset-2"
                  onClick={(event) => {
                    event.preventDefault();
                    focusFirst([item.id.slice(item.id.lastIndexOf("-") + 1)]);
                  }}
                >
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      {formError ? <InlineAlert tone="error" title={tError(formError)} /> : null}
      {intro}
      <div key={generation} className="flex flex-col gap-5">
        {fields.map((field) => (
          <div key={field.name}>{render(field)}</div>
        ))}
      </div>
      <Button type="submit" variant={submitVariant} loading={pending} className="self-start">
        {submitLabel}
      </Button>
      {confirm ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          onConfirm={async () => {
            await send();
          }}
        />
      ) : null}
    </form>
  );
}

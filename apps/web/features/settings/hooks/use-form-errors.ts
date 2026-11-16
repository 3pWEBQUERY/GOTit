"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SummaryEntry } from "../components/form-error-summary";

/**
 * Fehler eines Formulars als Übersetzungsschlüssel pro Feld (PRD 13): am Feld,
 * zusammengefasst oben, Fokus auf den ersten Fehler.
 */
export function useFormErrors<Field extends string>(fieldIds: Record<Field, string>) {
  const t = useTranslations("settings.errors");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const text = (key: string) => (t.has(key) ? t(key) : t("generic"));
  const fields = Object.keys(fieldIds) as Field[];

  function only(source: Record<string, string>): Partial<Record<Field, string>> {
    return Object.fromEntries(fields.filter((field) => source[field]).map((field) => [field, source[field]])) as Partial<Record<Field, string>>;
  }

  /** Übernimmt das Ergebnis einer Prüfung für ein einzelnes Feld, zum Beispiel beim Verlassen. */
  function applyField(field: Field, source: Record<string, string>) {
    setErrors((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)) as Partial<Record<Field, string>>;
      return source[field] ? { ...rest, [field]: source[field] } : rest;
    });
  }

  /** Übernimmt alle Fehler nach dem Absenden und setzt den Fokus auf den ersten. Gibt zurück, ob es Fehler gab. */
  function applyAll(source: Record<string, string>, form?: string | null): boolean {
    const next = only(source);
    setErrors(next);
    setFormError(form ? text(form) : null);
    const first = fields.find((field) => next[field]);
    if (first) requestAnimationFrame(() => document.getElementById(fieldIds[first])?.focus());
    return Boolean(first || form);
  }

  function clear() {
    setErrors({});
    setFormError(null);
  }

  const errorText = (field: Field) => (errors[field] ? text(errors[field]) : undefined);
  const summary: SummaryEntry[] = fields.filter((field) => errors[field]).map((field) => ({ fieldId: fieldIds[field], message: text(errors[field] ?? "generic") }));

  return { errorText, summary, formError, setFormError: (key: string | null) => setFormError(key ? text(key) : null), applyField, applyAll, clear, text };
}

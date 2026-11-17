"use client";

import type { ProfileSection } from "@app/core/provider-profile/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SummaryEntry } from "../../../settings/components/form-error-summary";
import { fieldId } from "./field-ids";

/**
 * Fehler eines Abschnitts als Übersetzungsschlüssel pro Pfad (PRD 13): am Feld,
 * zusammengefasst oben mit Sprunglinks, Fokus auf den ersten Fehler.
 */
export function useSectionErrors(section: ProfileSection) {
  const t = useTranslations("profile.errors");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null);
  const text = (key: string) => (t.has(key) ? t(key) : t("generic"));

  function applyAll(next: Record<string, string>, form?: string | null): boolean {
    setErrors(next);
    setFormErrorKey(form ?? null);
    const first = Object.keys(next)[0];
    if (first) requestAnimationFrame(() => document.getElementById(fieldId(section, first))?.focus());
    return Boolean(first || form);
  }

  function applyField(path: string, source: Record<string, string>) {
    setErrors((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== path));
      return source[path] ? { ...rest, [path]: source[path] } : rest;
    });
  }

  const summary: SummaryEntry[] = Object.entries(errors).map(([path, key]) => ({ fieldId: fieldId(section, path), message: text(key) }));
  return {
    errorText: (path: string) => (errors[path] ? text(errors[path]) : undefined),
    summary,
    formError: formErrorKey ? text(formErrorKey) : null,
    applyAll,
    applyField,
  };
}

export type SectionErrors = ReturnType<typeof useSectionErrors>;

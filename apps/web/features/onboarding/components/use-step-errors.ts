"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SummaryEntry } from "../../settings/components/form-error-summary";

/**
 * Fehler eines Schritts als Übersetzungsschlüssel pro Pfad (PRD 13): am Feld,
 * zusammengefasst oben mit Sprunglinks, Fokus auf den ersten Fehler.
 * `fieldId` ordnet einem Pfad wie `rates.0.priceChf` das Bedienelement zu.
 */
export function useStepErrors(fieldId: (path: string) => string) {
  const t = useTranslations("onboarding.errors");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null);

  const text = (key: string) => (t.has(key) ? t(key) : t("generic"));

  function applyAll(next: Record<string, string>, form?: string | null): boolean {
    setErrors(next);
    setFormErrorKey(form ?? null);
    const first = Object.keys(next)[0];
    if (first) requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus());
    return Boolean(first || form);
  }

  /** Übernimmt die Prüfung eines einzelnen Felds, zum Beispiel beim Verlassen. */
  function applyField(path: string, source: Record<string, string>) {
    setErrors((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== path));
      return source[path] ? { ...rest, [path]: source[path] } : rest;
    });
  }

  const summary: SummaryEntry[] = Object.entries(errors).map(([path, key]) => ({
    fieldId: fieldId(path),
    message: text(key),
  }));
  const errorText = (path: string) => (errors[path] ? text(errors[path]) : undefined);

  return {
    errorText,
    summary,
    formError: formErrorKey ? text(formErrorKey) : null,
    applyAll,
    applyField,
    setFormError: setFormErrorKey,
  };
}

/** Fehler aus einer Zod-Prüfung im Browser, mit demselben Schema wie die Server Action. */
export function issuesToErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
  fallback: (path: string) => string = () => "generic",
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "form";
    errors[path] ??= /^[a-zA-Z]+$/.test(issue.message) ? issue.message : fallback(path);
  }
  return errors;
}

/** Fehler der Server Action: unbekannte Texte werden zum passenden Schlüssel. */
export function normalizeErrors(source: Record<string, string>, fallback: (path: string) => string = () => "generic"): Record<string, string> {
  return Object.fromEntries(Object.entries(source).map(([path, key]) => [path, /^[a-zA-Z]+$/.test(key) ? key : fallback(path)]));
}

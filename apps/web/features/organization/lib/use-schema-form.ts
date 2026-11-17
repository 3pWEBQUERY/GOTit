"use client";

import { useState } from "react";
import type { z } from "zod";

type Shape = Record<string, z.ZodType>;

/**
 * Formularzustand mit dem Schema des Kerns: geprüft wird beim Verlassen eines
 * Felds und beim Speichern (PRD 13). Fehler sind Schlüssel wie «required»,
 * die die Oberfläche unter `organization.form.errors` übersetzt.
 */
export function useSchemaForm<Values extends object>(
  schema: z.ZodObject<Shape>,
  initial: Values,
) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<Key extends keyof Values & string>(
    field: Key,
    value: Values[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function blur(field: keyof Values & string) {
    const shape = (schema.shape as Shape)[field];
    if (!shape) return;
    const result = shape.safeParse(values[field]);
    setErrors((current) => {
      const rest = Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== field),
      );
      return result.success
        ? rest
        : { ...rest, [field]: result.error.issues[0]?.message ?? "invalid" };
    });
  }

  /** Prüft alles; gibt die Fehler zurück, damit der Aufrufer den Fokus setzen kann. */
  function validate(): Record<string, string> {
    const result = schema.safeParse(values);
    const found: Record<string, string> = {};
    if (!result.success)
      for (const issue of result.error.issues) {
        const key = issue.path.map(String).join(".") || "form";
        found[key] ??= issue.message;
      }
    setErrors(found);
    return found;
  }

  return { values, set, setValues, errors, setErrors, blur, validate };
}

/** Fokus auf das erste fehlerhafte Feld in der Reihenfolge des Formulars. */
export function focusFirstError(form: HTMLFormElement | null): void {
  requestAnimationFrame(() =>
    form?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
  );
}

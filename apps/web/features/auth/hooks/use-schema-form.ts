"use client";

import { useCallback, useRef, useState } from "react";
import type { z } from "zod";
import { fieldErrorsFromZod } from "@/features/account/action-result";

export type FieldErrors = Record<string, string>;

export interface SchemaForm<Values extends object, Output> {
  values: Values;
  /** Fehlerschlüssel pro Feld (Übersetzungsschlüssel unter `auth.errors`). */
  errors: FieldErrors;
  /** Ob schon einmal gesendet wurde; erst dann erscheint die Zusammenfassung oben. */
  submitted: boolean;
  setValue: <Name extends keyof Values>(name: Name, value: Values[Name], options?: { validate?: boolean }) => void;
  /** Prüfung beim Verlassen des Felds (PRD 13), nicht beim Tippen. */
  blur: (name: keyof Values & string) => void;
  /** Prüft alles, setzt die Fehler und liefert die geprüften Daten oder die Fehler. */
  validate: () => { ok: true; data: Output } | { ok: false; errors: FieldErrors };
  /** Fehler vom Server (Server Action) übernehmen. */
  setErrors: (errors: FieldErrors) => void;
}

/**
 * Formularzustand mit dem geteilten Zod-Schema aus `@app/core/account`.
 * Das Schema bleibt die einzige Quelle der Regeln; hier wird nur entschieden,
 * wann ein Fehler sichtbar wird.
 */
export function useSchemaForm<Values extends object, Schema extends z.ZodType>(
  schema: Schema,
  initialValues: Values,
  /** Bildet die Formularwerte auf die Eingabe des Schemas ab, falls sie sich unterscheiden. */
  toInput: (values: Values) => unknown = (values) => values,
): SchemaForm<Values, z.output<Schema>> {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrorState] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const latest = useRef(values);

  const errorsFor = useCallback(
    (current: Values): FieldErrors => {
      const result = schema.safeParse(toInput(current));
      return result.success ? {} : fieldErrorsFromZod(result.error.issues);
    },
    [schema, toInput],
  );

  const revalidateField = useCallback(
    (name: string, current: Values) => {
      const next = errorsFor(current)[name];
      setErrorState((previous) => {
        if (previous[name] === next) return previous;
        const rest = Object.fromEntries(Object.entries(previous).filter(([key]) => key !== name));
        return next ? { ...rest, [name]: next } : rest;
      });
    },
    [errorsFor],
  );

  const setValue = useCallback(
    <Name extends keyof Values>(name: Name, value: Values[Name], options?: { validate?: boolean }) => {
      const next = { ...latest.current, [name]: value };
      latest.current = next;
      setValues(next);
      if (options?.validate) revalidateField(String(name), next);
    },
    [revalidateField],
  );

  const blur = useCallback((name: keyof Values & string) => revalidateField(name, latest.current), [revalidateField]);

  const validate = useCallback((): { ok: true; data: z.output<Schema> } | { ok: false; errors: FieldErrors } => {
    setSubmitted(true);
    const result = schema.safeParse(toInput(latest.current));
    if (result.success) {
      setErrorState({});
      return { ok: true, data: result.data };
    }
    const next = fieldErrorsFromZod(result.error.issues);
    setErrorState(next);
    return { ok: false, errors: next };
  }, [schema, toInput]);

  const setErrors = useCallback((next: FieldErrors) => {
    setSubmitted(true);
    setErrorState(next);
  }, []);

  return { values, errors, submitted, setValue, blur, validate, setErrors };
}

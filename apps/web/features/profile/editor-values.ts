import type { CriticalValues, EditorValues, ProfileSection } from "@app/core/provider-profile/schemas";

/** Eine Preiszeile im Formular: der Preis bleibt Text, bis er geprüft ist. */
export interface RateFormRow {
  key: string;
  id?: string;
  durationMinutes: number;
  price: string;
  note: string;
  hidden: boolean;
}

export type FormValues = { [S in ProfileSection]: S extends "rates" ? { rates: RateFormRow[] } : EditorValues[S] };

export function toFormValues(values: EditorValues): FormValues {
  return {
    ...values,
    rates: {
      rates: values.rates.rates.map((rate, index) => ({
        key: rate.id ?? `neu-${index}`,
        id: rate.id,
        durationMinutes: rate.durationMinutes,
        price: String(rate.priceChf),
        note: rate.note ?? "",
        hidden: rate.hidden,
      })),
    },
  };
}

function priceOf(text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
}

/** Eingabe der Server Action für einen Abschnitt; geprüft wird mit dem Schema des Abschnitts. */
export function toSectionInput(section: ProfileSection, form: FormValues): unknown {
  if (section !== "rates") return form[section];
  return {
    rates: form.rates.rates.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      durationMinutes: row.durationMinutes,
      priceChf: priceOf(row.price),
      note: row.note.trim() || undefined,
      hidden: row.hidden,
    })),
  };
}

/** Prüfpflichtige Werte, die ein Abschnitt anfragt (für den Hinweis vor dem Speichern). */
export function requestedCritical(section: ProfileSection, form: FormValues): Partial<CriticalValues> {
  if (section === "basics") return { displayName: form.basics.displayName.trim() };
  if (section === "contact") return form.contact;
  if (section === "regions") return { regionIds: form.regions.regionIds };
  return {};
}

export function sameValues(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export { priceOf };

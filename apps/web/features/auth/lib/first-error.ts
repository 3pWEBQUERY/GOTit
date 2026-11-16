import { focusField } from "./focus-field";

/** Fokus zum ersten Fehler in der Reihenfolge des Formulars (PRD 13). */
export function focusFirstError(order: readonly string[], errors: Record<string, string>, idFor: (name: string) => string): void {
  const first = order.find((name) => errors[name]);
  if (first) window.requestAnimationFrame(() => focusField(idFor(first)));
}

/** Einträge für die Zusammenfassung oben, in der Reihenfolge des Formulars. */
export function summaryItems(
  order: readonly string[],
  errors: Record<string, string>,
  idFor: (name: string) => string,
  message: (key: string | undefined) => string | undefined,
): { fieldId: string; message: string }[] {
  return order.flatMap((name) => {
    const text = message(errors[name]);
    return text ? [{ fieldId: idFor(name), message: text }] : [];
  });
}

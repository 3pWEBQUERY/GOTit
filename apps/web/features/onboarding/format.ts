/** Dauer als Text in der Sprache der Seite: unter einer Stunde in Minuten, sonst in Stunden. */
export function formatDuration(locale: string, minutes: number): string {
  if (minutes < 60)
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "minute",
      unitDisplay: "long",
    }).format(minutes);
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "long",
    maximumFractionDigits: 1,
  }).format(minutes / 60);
}

export function formatChf(locale: string, amount: number): string {
  return new Intl.NumberFormat(`${locale}-CH`, {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Auswahl der Dauer im Angebot (30, 60, 90, 120 Minuten und länger). */
export const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440] as const;

/** Namen der Sprachen in der Sprache der Seite, zum Beispiel «Französisch». */
export function languageName(locale: string, code: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

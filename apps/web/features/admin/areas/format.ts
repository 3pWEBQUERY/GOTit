import type { Locale } from "@app/core/locale";

/** Datum und Zeit im Schweizer Format (PRD 13): TT.MM.JJJJ, 24 Stunden, Zürcher Zeit. */
export async function adminDates(locale: Locale) {
  const date = new Intl.DateTimeFormat(`${locale}-CH`, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const dateTime = new Intl.DateTimeFormat(`${locale}-CH`, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Zurich" });
  return { date: (value: Date) => date.format(value), dateTime: (value: Date) => dateTime.format(value) };
}

/** Datum TT.MM.JJJJ in Zürcher Zeit, in jeder Sprache mit Punkten (Schweizer Format). */
export function swissDate(locale: Locale, value: Date): string {
  return new Intl.DateTimeFormat(`${locale}-CH`, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" }).format(value);
}

/** Wert eines Suchparameters als Text; Mehrfachwerte zählen nicht. */
export function param(query: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = query[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

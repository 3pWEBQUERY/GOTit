import type { Locale } from "./types";

export interface LocalizedNames {
  nameDe: string;
  nameFr: string;
  nameIt: string;
  nameEn: string;
}

const COLUMN: Record<Locale, keyof LocalizedNames> = { de: "nameDe", fr: "nameFr", it: "nameIt", en: "nameEn" };

export function pickLocalizedName(names: LocalizedNames, locale: Locale): string {
  return names[COLUMN[locale]];
}

import type { Locale } from "@app/core/locale";
import { getPathname } from "@/i18n/navigation";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Baut fertige, übersetzte URLs für die Komponenten des Designsystems. */
export function createHref(locale: Locale) {
  return (href: Href): string => getPathname({ href, locale });
}

export type HrefBuilder = ReturnType<typeof createHref>;

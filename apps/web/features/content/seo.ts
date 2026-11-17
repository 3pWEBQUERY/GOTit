import { getSeoOverride } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";

/**
 * Wendet einen Eintrag aus `/admin/seo` auf die Metadaten einer Seite an
 * (Entscheid 0022). `path` ist der fertige Pfad mit Sprache, wie ihn
 * `createHref(locale)(…)` liefert, zum Beispiel «/fr/aide». Andere Seiten
 * nutzen das in `generateMetadata`:
 *
 *   return withSeoOverride({ title: … }, createHref(locale)("/ch"), locale);
 */
export async function withSeoOverride(metadata: Metadata, path: string, locale: Locale): Promise<Metadata> {
  const override = await getSeoOverride(path, locale);
  if (!override) return metadata;
  return {
    ...metadata,
    ...(override.title ? { title: override.title } : {}),
    ...(override.description ? { description: override.description } : {}),
    ...(override.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

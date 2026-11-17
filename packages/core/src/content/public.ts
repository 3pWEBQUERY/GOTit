import { getDb, type ContentKind } from "@app/db";
import { DEFAULT_LOCALE, type Locale } from "../locale";
import { contentKindSchema, contentLocaleSchema, contentSlugSchema, seoPathSchema } from "./schemas";

/**
 * Öffentliche Seiten aus dem CMS, ohne Recht. Nur veröffentlichte Seiten;
 * fehlt eine Sprache, gilt die deutsche Fassung, und `locale` sagt, welche
 * Sprache gezeigt wird (die Oberfläche setzt damit `lang`).
 */
const publicSelect = { kind: true, slug: true, locale: true, title: true, summary: true, body: true, metaTitle: true, metaDescription: true, publishedAt: true, updatedAt: true } as const;

export async function getPublishedPage(kind: ContentKind, slug: string, locale: string) {
  const parsedKind = contentKindSchema.safeParse(kind);
  const parsedSlug = contentSlugSchema.safeParse(slug);
  if (!parsedKind.success || !parsedSlug.success) return null;
  const requested: Locale = contentLocaleSchema.safeParse(locale).data ?? DEFAULT_LOCALE;
  const candidates = requested === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [requested, DEFAULT_LOCALE];
  const rows = await getDb().contentPage.findMany({
    where: { kind: parsedKind.data, slug: parsedSlug.data, locale: { in: candidates }, status: "PUBLISHED" },
    select: publicSelect,
  });
  const page = rows.find((row) => row.locale === requested) ?? rows.find((row) => row.locale === DEFAULT_LOCALE);
  return page ? { page, locale: page.locale as Locale, fallback: page.locale !== requested } : null;
}
export type PublishedPage = NonNullable<Awaited<ReturnType<typeof getPublishedPage>>>;

/** Hilfeartikel einer Sprache, ergänzt um deutsche Fassungen fehlender Artikel, nach Titel sortiert. */
export async function listPublishedHelp(locale: string) {
  const requested: Locale = contentLocaleSchema.safeParse(locale).data ?? DEFAULT_LOCALE;
  const rows = await getDb().contentPage.findMany({
    where: { kind: "HELP", status: "PUBLISHED", locale: { in: [...new Set([requested, DEFAULT_LOCALE])] } },
    select: { slug: true, locale: true, title: true, summary: true },
  });
  const bySlug = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = bySlug.get(row.slug);
    if (!current || row.locale === requested) bySlug.set(row.slug, row);
  }
  return [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title, requested));
}

export async function getSeoOverride(path: string, locale: string) {
  const parsedPath = seoPathSchema.safeParse(path);
  const parsedLocale = contentLocaleSchema.safeParse(locale);
  if (!parsedPath.success || !parsedLocale.success) return null;
  return getDb().seoOverride.findUnique({
    where: { path_locale: { path: parsedPath.data, locale: parsedLocale.data } },
    select: { title: true, description: true, noindex: true },
  });
}

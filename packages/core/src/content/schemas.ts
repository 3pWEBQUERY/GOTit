import { z } from "zod";
import { LOCALES } from "../locale";

/** Eingaben des CMS (v2 7.8 `/admin/inhalte`, `/admin/seo`). Der Text ist Markdown ohne HTML. */
export const CONTENT_KINDS = ["HELP", "LEGAL", "PAGE"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

export const contentSlugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const contentLocaleSchema = z.enum(LOCALES);
export const contentKindSchema = z.enum(CONTENT_KINDS);

export const contentPageSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  kind: contentKindSchema,
  slug: contentSlugSchema,
  locale: contentLocaleSchema,
  title: z.string().trim().min(1).max(120),
  summary: optionalText(300),
  body: z.string().max(50_000),
  metaTitle: optionalText(70),
  metaDescription: optionalText(160),
  // Ohne `publish` bleibt ein Entwurf ein Entwurf; eine veröffentlichte Seite bleibt veröffentlicht.
  publish: z.boolean().default(false),
});
export type ContentPageInput = z.input<typeof contentPageSchema>;

/** Pfad der Anwendung ohne Query und Anker, zum Beispiel «/de/zuerich». */
export const seoPathSchema = z
  .string()
  .max(200)
  .regex(/^\/[A-Za-z0-9\-._~/%]*$/);

export const seoOverrideSchema = z.object({
  path: seoPathSchema,
  locale: contentLocaleSchema,
  title: optionalText(70),
  description: optionalText(160),
  noindex: z.boolean().default(false),
});
export type SeoOverrideInput = z.input<typeof seoOverrideSchema>;

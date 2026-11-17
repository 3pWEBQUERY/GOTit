import type { PublishedPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { plainText, parseMarkdown } from "./markdown";
import { withSeoOverride } from "./seo";

/** Metadaten einer CMS-Seite: Meta-Titel und -Beschreibung, sonst Titel und Kurztext; danach der Eintrag aus `/admin/seo`. */
export async function contentMetadata(published: PublishedPage | null, path: string, locale: Locale): Promise<Metadata> {
  if (!published) return {};
  const { page } = published;
  const description = page.metaDescription ?? page.summary ?? plainText(parseMarkdown(page.body)).slice(0, 160);
  return withSeoOverride({ title: page.metaTitle ?? page.title, description }, path, locale);
}

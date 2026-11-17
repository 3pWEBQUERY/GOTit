import { getPublishedPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createHref } from "../shell/nav/href";
import { ContentArticle } from "./content-article";
import { contentMetadata } from "./page-metadata";

export type LegalSlug = "agb" | "datenschutz" | "impressum" | "richtlinien";
const PATHS = { agb: "/recht/agb", datenschutz: "/recht/datenschutz", impressum: "/recht/impressum", richtlinien: "/recht/richtlinien" } as const;

/** Rechtsseiten aus dem CMS (Art `LEGAL`); ohne veröffentlichte Fassung eine 404. */
export async function legalMetadata(locale: Locale, slug: LegalSlug): Promise<Metadata> {
  return contentMetadata(await getPublishedPage("LEGAL", slug, locale), createHref(locale)(PATHS[slug]), locale);
}

export async function LegalPage({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
  const published = await getPublishedPage("LEGAL", slug, locale);
  if (!published) notFound();
  return <ContentArticle locale={locale} published={published} />;
}

import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import { loadCategoryLanding } from "@/features/search/landing";

/** Unbekannte oder nicht freigegebene Kategorien ergeben eine echte 404. */
export default async function CategoryLayout({
  children,
  params,
}: LayoutProps<"/[locale]/kategorie/[slug]">) {
  const { locale, slug } = await params;
  if (!(await loadCategoryLanding(locale as Locale, slug))) notFound();
  return children;
}

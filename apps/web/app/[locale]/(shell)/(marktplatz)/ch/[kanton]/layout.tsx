import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import { loadRegionLanding } from "@/features/search/landing";

/** Prüft vor dem Ladezustand, ob der Kanton freigegeben ist, damit Unbekanntes eine echte 404 ergibt. */
export default async function CantonLayout({
  children,
  params,
}: LayoutProps<"/[locale]/ch/[kanton]">) {
  const { locale, kanton } = await params;
  if (!(await loadRegionLanding(locale as Locale, kanton))) notFound();
  return children;
}

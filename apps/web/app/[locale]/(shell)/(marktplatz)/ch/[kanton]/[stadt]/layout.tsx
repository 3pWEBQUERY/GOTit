import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import { loadRegionLanding } from "@/features/search/landing";

/** Eine Stadt verlangt ihren freigegebenen Kanton, sonst eine echte 404 (Entscheid 0013). */
export default async function CityLayout({
  children,
  params,
}: LayoutProps<"/[locale]/ch/[kanton]/[stadt]">) {
  const { locale, kanton, stadt } = await params;
  if (!(await loadRegionLanding(locale as Locale, kanton, stadt))) notFound();
  return children;
}

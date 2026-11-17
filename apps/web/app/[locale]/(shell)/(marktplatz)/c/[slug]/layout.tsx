import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { loadPublicOrganization } from "@/features/clubs/queries/load-organization";

/**
 * Prüft vor jedem Ladezustand, ob die Organisation veröffentlicht ist, damit
 * Entwürfe, gesperrte und unbekannte Organisationen eine echte 404 ergeben.
 * Die Abfrage ist pro Anfrage zwischengespeichert.
 */
export default async function ClubLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!(await loadPublicOrganization(slug, locale as Locale))) notFound();
  return children;
}

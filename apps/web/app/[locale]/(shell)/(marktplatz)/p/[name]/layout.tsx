import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { loadPublicProfile } from "@/features/profile/queries/load-public-profile";

/**
 * Prüft vor dem Ladezustand, ob das Profil für diesen Betrachter erreichbar ist,
 * damit gesperrte, archivierte und nie freigegebene Profile eine echte 404
 * ergeben (PRD v2 10.1). Die Abfrage ist pro Anfrage zwischengespeichert.
 */
export default async function ProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string; name: string }> }) {
  const { locale, name } = await params;
  if (!(await loadPublicProfile(name, locale as Locale))) notFound();
  return children;
}

import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { loadPublicOrganization } from "@/features/clubs/queries/load-organization";

/** Unbekannte Standorte ergeben vor dem Ladezustand eine echte 404. */
export default async function LocationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string; id: string }>;
}) {
  const { locale, slug, id } = await params;
  const organization = await loadPublicOrganization(slug, locale as Locale);
  if (!organization?.locations.some((location) => location.id === id))
    notFound();
  return children;
}

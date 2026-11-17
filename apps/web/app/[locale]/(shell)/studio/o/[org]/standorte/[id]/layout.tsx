import type { Locale } from "@app/core/locale";
import { requireLocation } from "@/features/organization/queries/locations";

/** Prüft vor dem Ladezustand, ob der Standort zur Organisation gehört; sonst eine echte 404. */
export default async function LocationLayout({ children, params }: LayoutProps<"/[locale]/studio/o/[org]/standorte/[id]">) {
  const { locale, org, id } = await params;
  await requireLocation(org, id, locale as Locale);
  return children;
}

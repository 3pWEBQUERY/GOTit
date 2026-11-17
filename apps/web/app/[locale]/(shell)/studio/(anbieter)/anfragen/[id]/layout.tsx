import type { Locale } from "@app/core/locale";
import { requireOwnRequest } from "@/features/booking/studio/queries/own-request";

/** Prüft vor dem Ladezustand, ob die Anfrage an das eigene Profil ging; sonst eine echte 404. */
export default async function RequestLayout({
  children,
  params,
}: LayoutProps<"/[locale]/studio/anfragen/[id]">) {
  const { locale, id } = await params;
  await requireOwnRequest(id, locale as Locale);
  return children;
}

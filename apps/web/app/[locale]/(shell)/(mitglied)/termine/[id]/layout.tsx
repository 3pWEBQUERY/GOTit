import type { Locale } from "@app/core/locale";
import { requireMemberRequest } from "@/features/booking/queries/load-detail";

/**
 * Prüft vor dem Ladezustand, ob das Konto an der Anfrage beteiligt ist, damit
 * eine fremde oder unbekannte ID eine echte 404 ergibt (Abnahme 20.5). Ist das
 * Konto Anbieter, führt die Seite ins Studio.
 */
export default async function AppointmentLayout({
  children,
  params,
}: LayoutProps<"/[locale]/termine/[id]">) {
  const { locale, id } = await params;
  await requireMemberRequest(locale as Locale, id);
  return children;
}

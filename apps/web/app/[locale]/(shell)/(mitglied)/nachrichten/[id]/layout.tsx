import type { Locale } from "@app/core/locale";
import { requireThreadIn } from "@/features/messages/queries/load-thread";

/**
 * Prüft vor dem Ladezustand, ob das Konto an der Unterhaltung beteiligt ist,
 * damit eine fremde oder unbekannte ID eine echte 404 ergibt (Entscheid 0014).
 * Gehört sie in den anderen Bereich, führt die Seite dorthin.
 */
export default async function ConversationLayout({
  children,
  params,
}: LayoutProps<"/[locale]/nachrichten/[id]">) {
  const { locale, id } = await params;
  await requireThreadIn(locale as Locale, id, "member");
  return children;
}

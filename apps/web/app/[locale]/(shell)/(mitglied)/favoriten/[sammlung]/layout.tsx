import type { Locale } from "@app/core/locale";
import { requireOwnCollection } from "@/features/favorites/queries/require-own-collection";

/**
 * Prüft vor dem Ladezustand, ob die Sammlung dem Konto gehört, damit eine
 * fremde oder unbekannte Id eine echte 404 ergibt (Entscheid 0013).
 */
export default async function CollectionLayout({
  children,
  params,
}: LayoutProps<"/[locale]/favoriten/[sammlung]">) {
  const { locale, sammlung } = await params;
  await requireOwnCollection(locale as Locale, sammlung);
  return children;
}

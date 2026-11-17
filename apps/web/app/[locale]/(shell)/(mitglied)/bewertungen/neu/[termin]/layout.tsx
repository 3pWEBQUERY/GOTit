import type { Locale } from "@app/core/locale";
import type { ReactNode } from "react";
import { requireEligibility } from "@/features/reviews/components/member/new-review-page";

/** Prüft vor dem Ladezustand, ob der Termin dem Konto gehört, damit ein fremder oder unbekannter eine echte 404 ergibt. */
export default async function NewReviewLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; termin: string }>;
}) {
  const { locale, termin } = await params;
  await requireEligibility(locale as Locale, termin);
  return children;
}

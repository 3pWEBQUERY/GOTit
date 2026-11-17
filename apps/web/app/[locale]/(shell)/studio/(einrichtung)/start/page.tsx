import type { Locale } from "@app/core/locale";
import { redirect } from "next/navigation";
import { firstOpenStep } from "@/features/onboarding/access";
import { SuspendedNotice } from "@/features/onboarding/components/suspended-notice";
import { requireOnboarding } from "@/features/onboarding/queries/require-onboarding";
import { stepHref } from "@/features/onboarding/step-href";

/** `/studio/start` führt zum ersten offenen Schritt, bei einer Rückgabe zum ersten mit Prüfnotiz (PRD 8.2). */
export default async function OnboardingStartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const gate = await requireOnboarding(locale);
  if (gate.kind === "suspended") return <SuspendedNotice locale={locale} data={gate.data} />;
  redirect(stepHref(locale, firstOpenStep(gate.data.done, gate.data.notes)));
}

import type { AccountViewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { redirect } from "@/i18n/navigation";
import { requireAccount } from "../../account/require-account";
import { onboardingAccess } from "../access";
import { loadOnboarding, type OnboardingData } from "./load-onboarding";

export type OnboardingGate = { kind: "edit"; viewer: AccountViewer; data: OnboardingData } | { kind: "suspended"; viewer: AccountViewer; data: OnboardingData };

/**
 * Zugriff auf das Onboarding: Entwurf und Korrektur bearbeiten, eingereichte,
 * freigegebene und pausierte Profile sehen den Prüfstatus in `/studio`,
 * gesperrte Profile eine Erklärung. Ohne Anbieterrolle zu «Für Anbieter».
 */
export async function requireOnboarding(locale: Locale): Promise<OnboardingGate> {
  const viewer = await requireAccount(locale);
  const access = onboardingAccess(viewer.provider?.status ?? null);
  if (access === "none") return redirect({ href: "/fuer-anbieter", locale });
  if (access === "in-review") return redirect({ href: "/studio", locale });
  const data = await loadOnboarding(viewer);
  return { kind: access === "edit" ? "edit" : "suspended", viewer, data };
}

"use server";

import { isLocale } from "@app/core/locale";
import { startIdentityCheck } from "@app/core/verification";
import { getPathname } from "@/i18n/navigation";
import type { ActionResult } from "../../account/action-result";
import { ownProviderUserId } from "../../onboarding/actions/own-provider";
import { stepSlug } from "../../onboarding/steps";

export type CheckOrigin = "onboarding" | "verification";

/**
 * Startet eine Prüfung beim Dienstleister für das eigene Konto. Das Rücksprungziel
 * baut der Server selbst; der Browser nennt nur, von welcher Seite er kommt.
 */
export async function startIdentityCheckAction(input: { locale: unknown; origin: unknown }): Promise<ActionResult<{ redirectUrl: string }>> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  if (typeof input.locale !== "string" || !isLocale(input.locale) || (input.origin !== "onboarding" && input.origin !== "verification"))
    return { ok: false, formError: "generic" };
  const locale = input.locale;
  const returnPath =
    input.origin === "onboarding"
      ? getPathname({
          href: {
            pathname: "/studio/start/[schritt]",
            params: { schritt: stepSlug(locale, "identity") },
          },
          locale,
        })
      : getPathname({ href: "/studio/verifizierung", locale });
  const result = await startIdentityCheck(userId, returnPath);
  if (!result.ok)
    return {
      ok: false,
      formError: result.reason === "provider-not-configured" ? "providerNotConfigured" : "notAllowed",
    };
  // Interne Adressen (Test-Dienstleister) bekommen die Sprache, externe bleiben, wie sie sind.
  const redirectUrl = result.redirectUrl.startsWith("/") && !result.redirectUrl.startsWith("//") ? `/${locale}${result.redirectUrl}` : result.redirectUrl;
  return { ok: true, data: { redirectUrl } };
}

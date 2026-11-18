import { hasOrganizationRole, hasProviderRole } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { Button, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { getPathname } from "@/i18n/navigation";

/**
 * «E-Mail bestätigt» mit dem nächsten Schritt. Better Auth meldet nach der
 * Bestätigung automatisch an; Anbieter gehen ins Onboarding, Clubs und
 * Agenturen ins Studio ihrer Organisation, alle anderen in den
 * Mitgliederbereich. Ohne Sitzung folgt die Anmeldung. Kam die Person über
 * `?weiter=` (zum Beispiel «Nachricht schreiben» auf einem Profil), führt der
 * Button Mitglieder dorthin zurück, Besucher über die Anmeldung (PRD v2 8.2).
 */
export async function EmailVerified({ locale, returnTo }: { locale: Locale; returnTo?: string }) {
  const t = await getTranslations({ locale, namespace: "auth.confirm.verified" });
  const viewer = await getViewer();
  const step =
    viewer.kind !== "account"
      ? { text: t("visitor"), action: t("visitorAction"), href: getPathname({ href: { pathname: "/anmelden", query: returnTo ? { weiter: returnTo } : undefined }, locale }) }
      : hasProviderRole(viewer)
        ? { text: t("provider"), action: t("providerAction"), href: getPathname({ href: "/studio/start", locale }) }
        : hasOrganizationRole(viewer)
          ? { text: t("organization"), action: t("organizationAction"), href: getPathname({ href: "/studio", locale }) }
          : returnTo
            ? { text: t("memberReturn"), action: t("returnAction"), href: returnTo }
            : { text: t("member"), action: t("memberAction"), href: getPathname({ href: "/ich", locale }) };
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-ink">{step.text}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <UiLink href={step.href}>{step.action}</UiLink>
        </Button>
        <Button asChild variant="quiet">
          <UiLink href={getPathname({ href: "/", locale })}>{t("home")}</UiLink>
        </Button>
      </div>
    </div>
  );
}

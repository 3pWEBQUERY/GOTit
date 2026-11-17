import { hasProviderRole } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { ProfileStatusForViewer } from "@/features/shell/components/profile-status-for-viewer";
import { getViewer } from "@/features/shell/queries/get-viewer";

/**
 * Onboarding und Verifizierung: eigene Gruppe, damit die Weiterleitung von
 * `(anbieter)` (Entwurf → `/studio/start`) hier nicht greift. Jede Seite prüft
 * den Profilstatus selbst; StudioFrame liefert Anmeldung und Seitenleiste.
 */
export default async function SetupLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const viewer = await getViewer();
  if (viewer.kind === "account" && !hasProviderRole(viewer)) {
    const organization = viewer.organizations[0];
    if (organization)
      return redirect({
        href: {
          pathname: "/studio/o/[org]",
          params: { org: organization.slug },
        },
        locale,
      });
    return redirect({ href: "/fuer-anbieter", locale });
  }
  return (
    <>
      <div className="mb-4 md:hidden">
        <ProfileStatusForViewer locale={locale} viewer={viewer} />
      </div>
      {children}
    </>
  );
}

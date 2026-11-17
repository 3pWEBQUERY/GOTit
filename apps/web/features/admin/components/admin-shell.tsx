import type { Locale } from "@app/core/locale";
import { Button, SkipLink, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { countMediaInReview } from "../media/queries";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

const APP_NAME = process.env.APP_NAME ?? "GOTit";

export interface AdminShellProps {
  locale: Locale;
  name: string;
  /** Offene Prüffälle; nur für Personen mit Prüfrolle, sonst null. Dann zählt auch der Bereich Medien seine offenen Fälle. */
  openCases: number | null;
  /** Offene Meldungen; nur für Personen mit Moderationsrolle, sonst null. */
  openReports: number | null;
  /** Neue Bewertungen und offene Einsprüche; nur für Personen mit Moderationsrolle, sonst null. */
  openReviews: number | null;
  /** Eingereichte Nachweise von Organisationen; nur für Personen mit Moderationsrolle, sonst null. */
  openOrganizations: number | null;
  children: ReactNode;
}

/**
 * Eigene, dichte Shell des Admins (PRD 12.4): feste Seitenleiste ab 1024 px,
 * darüber ein Kopf mit Konto, Weg zum Marktplatz und Abmelden. Kein Glas.
 */
export async function AdminShell({ locale, name, openCases, openReports, openReviews, openOrganizations, children }: AdminShellProps) {
  const [t, openMedia] = await Promise.all([getTranslations({ locale, namespace: "admin.shell" }), openCases !== null ? countMediaInReview() : Promise.resolve(null)]);
  const href = createHref(locale);
  const items: AdminNavItem[] = [
    { key: "overview", href: href("/admin"), label: t("overview") },
    {
      key: "verifications",
      href: href("/admin/verifizierungen"),
      label: t("verifications"),
      ...(openCases !== null && openCases > 0 ? { count: { value: openCases, label: t("openCount", { count: openCases }) } } : {}),
    },
    {
      key: "media",
      href: href("/admin/medien"),
      label: t("media"),
      ...(openMedia !== null && openMedia > 0 ? { count: { value: openMedia, label: t("openMediaCount", { count: openMedia }) } } : {}),
    },
    {
      key: "organizations",
      href: href("/admin/organisationen"),
      label: t("organizations"),
      ...(openOrganizations !== null && openOrganizations > 0 ? { count: { value: openOrganizations, label: t("openOrganizationCount", { count: openOrganizations }) } } : {}),
    },
    {
      key: "reports",
      href: href("/admin/meldungen"),
      label: t("reports"),
      ...(openReports !== null && openReports > 0 ? { count: { value: openReports, label: t("openReportCount", { count: openReports }) } } : {}),
    },
    {
      key: "reviews",
      href: href("/admin/bewertungen"),
      label: t("reviews"),
      ...(openReviews !== null && openReviews > 0 ? { count: { value: openReviews, label: t("openReviewCount", { count: openReviews }) } } : {}),
    },
  ];
  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <SkipLink href="#inhalt">{t("skipToContent")}</SkipLink>
      <div className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:py-4">
          <p className="text-label text-ink">{t("brand", { appName: APP_NAME })}</p>
          <AdminNav label={t("navLabel")} items={items} root={href("/admin")} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-b border-border px-4 py-2 lg:px-6">
          <p className="mr-auto min-w-0 text-small text-ink-muted">{t("signedInAs", { name })}</p>
          <Button asChild variant="quiet">
            <UiLink href={href("/")}>{t("toMarketplace")}</UiLink>
          </Button>
          <SignOutButton label={t("signOut")} redirectTo={href("/")} />
        </header>
        <main id="inhalt" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 outline-none lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

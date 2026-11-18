import type { Locale } from "@app/core/locale";
import { Button, SkipLink, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { adminNavVisibility } from "../areas/nav";
import { countMediaInReview } from "../media/queries";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

const APP_NAME = process.env.APP_NAME ?? "TheGND";

export interface AdminShellProps {
  locale: Locale;
  name: string;
  /** Offene Prüffälle; nur für Personen mit Prüfrolle, sonst null. Dann zählt auch der Bereich Medien seine offenen Fälle. */
  openCases: number | null;
  /** Offene Fälle der Moderation samt offener Einsprüche; nur für Personen mit Moderationsrolle, sonst null. */
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
  const [t, tArea, visibility, openMedia] = await Promise.all([
    getTranslations({ locale, namespace: "admin.shell" }),
    getTranslations({ locale, namespace: "adminCommon.areas" }),
    adminNavVisibility(),
    openCases !== null ? countMediaInReview() : Promise.resolve(null),
  ]);
  const href = createHref(locale);
  const items: AdminNavItem[] = [
    { key: "overview", href: href("/admin"), label: t("overview") },
    { key: "users", href: href("/admin/benutzer"), label: tArea("users") },
    { key: "providers", href: href("/admin/anbieter"), label: tArea("providers") },
    {
      key: "organizations",
      href: href("/admin/unternehmen"),
      label: tArea("companies"),
      ...(openOrganizations !== null && openOrganizations > 0 ? { count: { value: openOrganizations, label: t("openOrganizationCount", { count: openOrganizations }) } } : {}),
    },
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
      key: "moderation",
      href: href("/admin/moderation"),
      label: t("reports"),
      ...(openReports !== null && openReports > 0 ? { count: { value: openReports, label: t("openReportCount", { count: openReports }) } } : {}),
    },
    {
      key: "reviews",
      href: href("/admin/bewertungen"),
      label: t("reviews"),
      ...(openReviews !== null && openReviews > 0 ? { count: { value: openReviews, label: t("openReviewCount", { count: openReviews }) } } : {}),
    },
    { key: "regions", href: href("/admin/regionen"), label: tArea("regions") },
    { key: "categories", href: href("/admin/kategorien"), label: tArea("categories") },
    { key: "content", href: href("/admin/inhalte"), label: tArea("content") },
    { key: "seo", href: href("/admin/seo"), label: tArea("seo") },
    { key: "support", href: href("/admin/support"), label: tArea("support") },
    { key: "system", href: href("/admin/system"), label: tArea("system") },
  ].filter((item) => visibility[item.key] ?? true);
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

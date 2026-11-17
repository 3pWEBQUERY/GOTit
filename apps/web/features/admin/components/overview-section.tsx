import { getPlatformOverview, hasPermission, permissionsOf, type AdminPermission } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { Button, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { canModerate, canReview, getAdminContext } from "../access";
import { AdminPageHeader } from "./page-header";

type Href = Parameters<ReturnType<typeof createHref>>[0];

interface Tile {
  key: string;
  title: string;
  value: number | null;
  /** Ein Satz unter der Zahl; bei Zahl null steht er allein. */
  detail?: ReactNode;
  link?: { href: string; label: string } | null;
  /** Statt einer Zahl, zum Beispiel «Kommt mit Phase 2». */
  placeholder?: string;
  /** Hervorheben, wenn Arbeit wartet. */
  attention?: boolean;
}

/**
 * Plattformübersicht `/admin` (v1 9.1): Zahlen aus dem Kern, je mit Link zur
 * Warteschlange, wenn die Person sie öffnen darf. Abos und Zahlungen kommen
 * mit Phase 2; technische Fehler stehen in den Logs von Railway.
 */
export async function OverviewSection({ locale }: { locale: Locale }) {
  const [{ actor }, t] = await Promise.all([getAdminContext(), getTranslations({ locale, namespace: "adminCommon.overview" })]);
  // Layout und Seite rendern parallel: Ohne Recht zeigt das Layout die 404 oder den Hinweis auf 2FA.
  if (!actor || !hasPermission(actor, "dashboard.view")) return null;
  const overview = await getPlatformOverview(actor.userId);
  const href = createHref(locale);
  const permissions = new Set<AdminPermission>(permissionsOf(actor));
  const reviewer = canReview(actor);
  const moderator = canModerate(actor);
  const link = (allowed: boolean, target: Href, label: string) => (allowed ? { href: href(target), label } : null);

  const { last7Days, previous7Days } = overview.registrations;
  const diff = last7Days - previous7Days;
  const comparison =
    diff > 0 ? t("registrations.more", { count: diff, previous: previous7Days }) : diff < 0 ? t("registrations.fewer", { count: -diff, previous: previous7Days }) : t("registrations.same", { previous: previous7Days });
  const warnings = overview.securityWarnings;

  const tiles: Tile[] = [
    { key: "registrations", title: t("registrations.title"), value: last7Days, detail: comparison, link: link(permissions.has("users.view"), "/admin/benutzer", t("registrations.link")) },
    { key: "profiles", title: t("profiles.title"), value: overview.activeProfiles, detail: t("profiles.detail"), link: link(permissions.has("providers.view"), { pathname: "/admin/anbieter", query: { status: "PUBLISHED" } }, t("profiles.link")) },
    {
      key: "verifications",
      title: t("verifications.title"),
      value: overview.pendingVerifications,
      detail: reviewer ? t("verifications.detail") : t("verifications.reviewOnly"),
      link: link(reviewer, "/admin/verifizierungen", t("verifications.link")),
      attention: overview.pendingVerifications > 0,
    },
    {
      key: "moderation",
      title: t("moderation.title"),
      value: overview.moderation.openCases,
      detail: t("moderation.detail", { count: overview.moderation.criticalCases }),
      link: link(moderator, "/admin/moderation", t("moderation.link")),
      attention: overview.moderation.criticalCases > 0,
    },
    {
      key: "appeals",
      title: t("appeals.title"),
      value: overview.moderation.openRestrictionAppeals,
      detail: t("appeals.detail"),
      link: link(moderator, { pathname: "/admin/moderation", query: { ansicht: "sperren" } }, t("appeals.link")),
    },
    { key: "reviews", title: t("reviews.title"), value: overview.moderation.pendingReviews, detail: t("reviews.detail"), link: link(moderator, "/admin/bewertungen", t("reviews.link")) },
    { key: "media", title: t("media.title"), value: overview.moderation.pendingMedia, detail: t("media.detail"), link: link(reviewer, "/admin/medien", t("media.link")) },
    { key: "companies", title: t("companies.title"), value: overview.submittedOrganizations, detail: t("companies.detail"), link: link(moderator, "/admin/unternehmen", t("companies.link")) },
    {
      key: "complaints",
      title: t("complaints.title"),
      value: overview.openSupportTickets,
      detail: t("complaints.detail"),
      link: link(permissions.has("support.handle"), { pathname: "/admin/support", query: { status: "OPEN" } }, t("complaints.link")),
    },
    {
      key: "security",
      title: t("security.title"),
      value: warnings.last24h,
      detail: t("security.detail", {
        twoFactor: warnings.byType.TWO_FACTOR_DISABLED ?? 0,
        password: warnings.byType.PASSWORD_RESET ?? 0,
        passkey: warnings.byType.PASSKEY_REMOVED ?? 0,
      }),
      link: link(permissions.has("audit.view"), "/admin/system/audit", t("security.link")),
      attention: warnings.last24h > 0,
    },
    { key: "billing", title: t("billing.title"), value: null, placeholder: t("phase2"), detail: t("billing.detail") },
    { key: "errors", title: t("errors.title"), value: null, detail: t("errors.detail"), link: link(permissions.has("system.status"), "/admin/system/status", t("errors.link")) },
  ];

  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-overview>
        {tiles.map((tile) => (
          <li key={tile.key} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" data-overview-tile={tile.key}>
            <h2 id={`kachel-${tile.key}`} className="text-h3">
              {tile.title}
            </h2>
            {tile.value !== null ? (
              <p className="tabular text-h2" {...(tile.key === "verifications" ? { "data-open-count": true } : {})}>
                {tile.value}
              </p>
            ) : tile.placeholder ? (
              <p className="text-label text-ink-muted">{tile.placeholder}</p>
            ) : null}
            {tile.detail ? <p className="text-small text-ink-muted">{tile.detail}</p> : null}
            {tile.link ? (
              <Button asChild variant={tile.attention ? "primary" : "secondary"} className="mt-auto self-start">
                <UiLink href={tile.link.href} aria-describedby={`kachel-${tile.key}`}>
                  {tile.link.label}
                </UiLink>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

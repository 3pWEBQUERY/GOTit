import { adminAccess } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { countOpenReports } from "@app/core/moderation";
import { notFound } from "next/navigation";
import { requireAccount } from "@/features/account/require-account";
import { canModerate, canReview, getAdminContext } from "@/features/admin/access";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { TwoFactorRequired } from "@/features/admin/components/two-factor-required";
import { countOpenCases } from "@/features/admin/queries/get-queue";
import { countOpenOrganizationVerifications } from "@/features/organization/admin/queries";
import { countOpenReviewCases } from "@/features/reviews/queries/admin";

/**
 * Zugang zur Admin-Anwendung (PRD 7.8, 16.2): angemeldet, interne Rolle,
 * zweiter Faktor. Ohne Rolle eine gewöhnliche 404. Jede Server Action prüft
 * den Zugang zusätzlich selbst.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  await requireAccount(locale);
  const { actor, name } = await getAdminContext();
  const access = adminAccess(actor);
  if (!access.allowed && access.reason === "no-role") notFound();
  if (!access.allowed) return <TwoFactorRequired locale={locale} />;
  const moderator = actor !== null && canModerate(actor);
  const [openCases, openReports, openReviews, openOrganizations] = await Promise.all([
    canReview(actor) ? countOpenCases() : null,
    moderator ? countOpenReports(actor.userId) : null,
    moderator ? countOpenReviewCases() : null,
    moderator ? countOpenOrganizationVerifications() : null,
  ]);
  return (
    <AdminShell locale={locale} name={name} openCases={openCases} openReports={openReports} openReviews={openReviews} openOrganizations={openOrganizations}>
      {children}
    </AdminShell>
  );
}

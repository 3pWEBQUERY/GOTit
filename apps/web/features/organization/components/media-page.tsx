import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MediaLibrary } from "../../media/library/media-library";
import { loadOrganizationLibrary } from "../../media/queries/load-library";
import { requireOrganization } from "../queries/membership";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";

/**
 * `/studio/o/[org]/medien` (v1 FR-BUSINESS-001: Logo, Titelbild, Galerie).
 * Dieselbe Bibliothek wie im Anbieter-Studio, für die Organisation: Upload mit
 * Bestätigung der Rechte, Moderation, Ordnen, Logo und Titelbild.
 */
export async function OrganizationMediaPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const context = await requireOrganization(slug);
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "organization.media" }),
    loadOrganizationLibrary(context.userId, slug, locale),
  ]);
  if (!data) notFound();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading title={t("title")} intro={t("intro")} />
      {data.canEdit ? null : <PermissionNote text={t("noPermission")} />}
      <MediaLibrary data={data} />
    </div>
  );
}

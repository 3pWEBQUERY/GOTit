import { adminAccess } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAdminContext } from "../../admin/access";

/** Seitentitel im Admin; ohne interne Rolle leer, damit die 404 nichts verrät (PRD 16.2). */
export async function organizationAdminMetadata(
  locale: Locale,
  key: "queue" | "case",
): Promise<Metadata> {
  const { actor } = await getAdminContext();
  const access = adminAccess(actor);
  if (!access.allowed && access.reason === "no-role") return {};
  const t = await getTranslations({
    locale,
    namespace: "organization.admin.meta",
  });
  return { title: t(key), robots: { index: false, follow: false } };
}

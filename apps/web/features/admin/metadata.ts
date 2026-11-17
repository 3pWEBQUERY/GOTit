import { adminAccess } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAdminContext } from "./access";

/**
 * Seitentitel des Admins. Ohne interne Rolle bleibt er leer, damit auch der
 * Titel der 404 nichts über den Admin verrät (PRD 16.2).
 */
export async function adminMetadata(locale: Locale, key: "overview" | "queue" | "case" | "mediaQueue" | "mediaCase"): Promise<Metadata> {
  const { actor } = await getAdminContext();
  const access = adminAccess(actor);
  if (!access.allowed && access.reason === "no-role") return {};
  const t = await getTranslations({ locale, namespace: "admin.meta" });
  return { title: t(key), robots: { index: false, follow: false } };
}

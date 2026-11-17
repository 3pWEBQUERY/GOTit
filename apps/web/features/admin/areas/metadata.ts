import { adminAccess } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAdminContext } from "../access";

export type AreaMetaKey =
  | "users"
  | "user"
  | "providers"
  | "regions"
  | "categories"
  | "content"
  | "contentNew"
  | "contentEdit"
  | "seo"
  | "support"
  | "ticket"
  | "flags"
  | "roles"
  | "audit"
  | "status";

/** Seitentitel eines Bereichs; ohne interne Rolle leer, wie `adminMetadata` (PRD 16.2). */
export async function areaMetadata(locale: Locale, key: AreaMetaKey): Promise<Metadata> {
  const { actor } = await getAdminContext();
  const access = adminAccess(actor);
  if (!access.allowed && access.reason === "no-role") return {};
  const t = await getTranslations({ locale, namespace: "adminCommon.meta" });
  return { title: t(key), robots: { index: false, follow: false } };
}

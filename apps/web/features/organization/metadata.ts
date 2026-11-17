import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export type OrganizationPageKey =
  | "today"
  | "profile"
  | "credentials"
  | "locations"
  | "location"
  | "providers"
  | "media"
  | "settings";

/** Seitentitel im Studio der Organisation; neutral, ohne Namen der Organisation (PRD 13: Diskretion). */
export async function organizationMetadata(
  locale: Locale,
  key: OrganizationPageKey,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "organization.meta" });
  return { title: t(key) };
}

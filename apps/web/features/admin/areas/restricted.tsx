import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import { AreaRestricted } from "../components/area-restricted";

export type AreaKey = "users" | "providers" | "regions" | "categories" | "content" | "seo" | "support" | "flags" | "roles" | "audit" | "status";

/** Hinweis ohne Recht: Titel des Bereichs und wer ihn nutzt (PRD 13 «Berechtigung»). */
export async function RestrictedArea({ locale, area }: { locale: Locale; area: AreaKey }) {
  const t = await getTranslations({ locale, namespace: "adminCommon" });
  return <AreaRestricted locale={locale} title={t(`areas.${area}`)} alertTitle={t("restrictedTitle")} description={t(`restricted.${area}`)} />;
}

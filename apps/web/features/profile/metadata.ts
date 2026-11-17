import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createHref } from "../shell/nav/href";
import type { ProfileTab } from "./components/page/profile-tabs";
import { loadPublicProfile } from "./queries/load-public-profile";

/**
 * Metadaten der Profilseite (PRD v2 10.1, v1 16.1): Canonical auf die
 * Übersicht, `noindex` für pausierte Profile, für alle Tabs ausser der
 * Übersicht und für alles, was Besucher nicht sehen. Nur öffentliche Angaben.
 */
export async function profileMetadata(locale: Locale, slug: string, tab: ProfileTab): Promise<Metadata> {
  const [result, t] = await Promise.all([loadPublicProfile(slug, locale), getTranslations({ locale, namespace: "profile.meta" })]);
  const noindex = { index: false, follow: false };
  if (!result) return { title: t("notFound"), robots: noindex };
  const href = createHref(locale);
  const canonical = href({ pathname: "/p/[name]", params: { name: result.state === "members-only" ? result.slug : result.profile.slug } });
  if (result.state === "members-only") return { title: result.displayName, alternates: { canonical }, robots: noindex };
  const { profile } = result;
  const regions = profile.regions.map((region) => region.name).join(", ");
  const title = tab === "media" ? t("mediaTitle", { name: profile.displayName }) : tab === "reviews" ? t("reviewsTitle", { name: profile.displayName }) : profile.displayName;
  const description = profile.shortDescription ?? (regions ? t("description", { name: profile.displayName, regions }) : t("descriptionNoRegion", { name: profile.displayName }));
  const indexable = result.state === "ready" && tab === "overview";
  return { title, description, alternates: { canonical }, robots: indexable ? undefined : noindex };
}

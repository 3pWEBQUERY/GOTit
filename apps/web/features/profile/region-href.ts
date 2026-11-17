import type { Locale } from "@app/core/locale";
import type { PublicRegion } from "@app/core/provider-profile";
import { createHref } from "../shell/nav/href";

/** Regionale Landingpage einer Region (PRD 7.1): Stadt unter ihrem Kanton, sonst der Kanton. */
export function regionHref(locale: Locale, region: Pick<PublicRegion, "kind" | "slug" | "cantonSlug">): string {
  const href = createHref(locale);
  if (region.kind === "CITY" && region.cantonSlug) return href({ pathname: "/ch/[kanton]/[stadt]", params: { kanton: region.cantonSlug, stadt: region.slug } });
  return href({ pathname: "/ch/[kanton]", params: { kanton: region.slug } });
}

"use server";

import { LOCALES, type Locale } from "@app/core/locale";
import { nearestRegion } from "@app/core/search";
import { cookies } from "next/headers";
import { listDiscoverRegions } from "../queries/current-region";
import {
  NEAR_ME_MAX_KM,
  REGION_COOKIE,
  REGION_COOKIE_MAX_AGE,
} from "../region-cookie";

export type SetRegionResult =
  | { ok: true; name: string }
  | { ok: false; reason: "unknown" | "none" };

async function remember(slug: string): Promise<void> {
  (await cookies()).set(REGION_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REGION_COOKIE_MAX_AGE,
  });
}

async function approved(locale: unknown, slug: string) {
  if (!LOCALES.includes(locale as Locale)) return null;
  return (
    (await listDiscoverRegions(locale as Locale)).find(
      (region) => region.slug === slug,
    ) ?? null
  );
}

/** «Region ändern» auf Entdecken: merkt sich die gewählte, freigegebene Region (Entscheid 0013). */
export async function setRegionAction(
  slug: unknown,
  locale: unknown,
): Promise<SetRegionResult> {
  const region = typeof slug === "string" ? await approved(locale, slug) : null;
  if (!region) return { ok: false, reason: "unknown" };
  await remember(region.slug);
  return { ok: true, name: region.name };
}

/**
 * «In meiner Nähe»: bestimmt aus dem Standort des Geräts die nächste
 * freigegebene Region und merkt sich nur deren Slug. Die Koordinaten werden
 * weder gespeichert noch geloggt.
 */
export async function nearMeAction(
  latitude: unknown,
  longitude: unknown,
  locale: unknown,
): Promise<SetRegionResult> {
  if (typeof latitude !== "number" || typeof longitude !== "number")
    return { ok: false, reason: "unknown" };
  const nearest = await nearestRegion(latitude, longitude);
  if (!nearest || nearest.distanceKm > NEAR_ME_MAX_KM)
    return { ok: false, reason: "none" };
  const region = await approved(locale, nearest.slug);
  if (!region) return { ok: false, reason: "none" };
  await remember(region.slug);
  return { ok: true, name: region.name };
}

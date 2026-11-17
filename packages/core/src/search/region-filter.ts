import { getDb } from "@app/db";

const EARTH_KM = 6371;

/** Entfernung zweier Ortsmittelpunkte in Kilometern (Haversine). */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/**
 * Regionen, die ein Standortfilter abdeckt. Ohne Umkreis genau die gewählte
 * Region; der Index führt zu jeder Stadt ihren Kanton, deshalb findet ein
 * Kanton auch die Profile seiner Städte. Mit Umkreis zusätzlich alle
 * freigegebenen Regionen, deren Mittelpunkt im Umkreis liegt.
 * `null`: Die Region ist unbekannt oder nicht freigegeben.
 */
export async function resolveRegionFilter(
  slug: string,
  radiusKm: number | null,
): Promise<{ regionId: string; ids: string[] } | null> {
  const db = getDb();
  const region = await db.region.findFirst({
    where: { slug, approved: true },
    select: { id: true, latitude: true, longitude: true },
  });
  if (!region) return null;
  if (!radiusKm || region.latitude === null || region.longitude === null)
    return { regionId: region.id, ids: [region.id] };
  const center = { latitude: region.latitude, longitude: region.longitude };
  const others = await db.region.findMany({
    where: {
      approved: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, latitude: true, longitude: true },
  });
  const ids = others
    .filter(
      (other) =>
        distanceKm(center, {
          latitude: other.latitude ?? 0,
          longitude: other.longitude ?? 0,
        }) <= radiusKm,
    )
    .map((other) => other.id);
  return { regionId: region.id, ids: [...new Set([region.id, ...ids])] };
}

/**
 * Nächste freigegebene Region mit Mittelpunkt zu einem Standort («In meiner
 * Nähe», Entscheid 0013). Bei gleichem Mittelpunkt gewinnt die Stadt vor dem
 * Kanton. Die Koordinaten werden nur verglichen, nie gespeichert.
 */
export async function nearestRegion(
  latitude: number,
  longitude: number,
): Promise<{ slug: string; distanceKm: number } | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const regions = await getDb().region.findMany({
    where: {
      approved: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { slug: true, kind: true, latitude: true, longitude: true },
  });
  let best: { slug: string; distanceKm: number; city: boolean } | null = null;
  for (const region of regions) {
    const distance = distanceKm(
      { latitude, longitude },
      { latitude: region.latitude ?? 0, longitude: region.longitude ?? 0 },
    );
    const city = region.kind === "CITY";
    if (
      !best ||
      distance < best.distanceKm - 0.01 ||
      (Math.abs(distance - best.distanceKm) <= 0.01 && city && !best.city)
    )
      best = { slug: region.slug, distanceKm: distance, city };
  }
  return best ? { slug: best.slug, distanceKm: best.distanceKm } : null;
}

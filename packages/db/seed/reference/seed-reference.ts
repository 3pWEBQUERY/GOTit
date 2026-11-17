import type { PrismaClient } from "../../src";
import { cantons } from "./cantons";
import { featuredCities } from "./cities";

/** Referenzdaten für jede Umgebung: Regionen und Feature Flags. Wiederholbar. */
export async function seedReference(db: PrismaClient): Promise<void> {
  const approvedCantons = new Set(
    featuredCities.map((city) => city.cantonSlug),
  );
  for (const canton of cantons) {
    await db.region.upsert({
      where: { slug: canton.slug },
      create: {
        ...canton,
        kind: "CANTON",
        approved: approvedCantons.has(canton.slug),
      },
      update: {
        nameDe: canton.nameDe,
        nameFr: canton.nameFr,
        nameIt: canton.nameIt,
        nameEn: canton.nameEn,
        latitude: canton.latitude,
        longitude: canton.longitude,
      },
    });
  }
  for (const [index, { cantonSlug, ...city }] of featuredCities.entries()) {
    const parent = await db.region.findUniqueOrThrow({
      where: { slug: cantonSlug },
    });
    await db.region.upsert({
      where: { slug: city.slug },
      create: {
        ...city,
        kind: "CITY",
        parentId: parent.id,
        approved: true,
        featuredRank: index + 1,
      },
      update: {
        nameDe: city.nameDe,
        nameFr: city.nameFr,
        nameIt: city.nameIt,
        nameEn: city.nameEn,
        latitude: city.latitude,
        longitude: city.longitude,
      },
    });
  }
  // Phase 2 und 3 bleiben aus, bis sie gebaut und freigegeben sind.
  for (const key of ["community", "business-suite"]) {
    await db.featureFlag.upsert({
      where: { key },
      create: { key, enabled: false },
      update: {},
    });
  }
}

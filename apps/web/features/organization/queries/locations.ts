import type { Locale } from "@app/core/locale";
import {
  listLocations,
  listOrganizationProviders,
  type LinkedProviderRow,
} from "@app/core/organization";
import { notFound } from "next/navigation";
import { cache } from "react";
import { listApprovedRegions } from "../../onboarding/queries/list-approved-regions";
import { requireOrganization } from "./membership";

export type LocationRow = NonNullable<
  Awaited<ReturnType<typeof listLocations>>
>[number];

export interface RegionChoice {
  value: string;
  label: string;
}

/** Freigegebene Regionen als flache Auswahl: Kanton, darunter seine Städte mit Kanton im Namen. */
export const loadRegionChoices = cache(
  async (locale: Locale): Promise<RegionChoice[]> => {
    const { cantons, looseCities } = await listApprovedRegions(locale);
    return [
      ...cantons.flatMap((canton) => [
        { value: canton.id, label: canton.name },
        ...canton.cities.map((city) => ({
          value: city.id,
          label: `${city.name} (${canton.name})`,
        })),
      ]),
      ...looseCities.map((city) => ({ value: city.id, label: city.name })),
    ];
  },
);

/** Standorte der Organisation mit Regionen und zugeordneten Anbietern; einmal pro Anfrage. */
export const loadLocations = cache(async (slug: string, locale: Locale) => {
  const context = await requireOrganization(slug);
  const [locations, regions, providers] = await Promise.all([
    listLocations(context.userId, slug),
    loadRegionChoices(locale),
    listOrganizationProviders(context.userId, slug, locale),
  ]);
  if (!locations) notFound();
  const regionName = new Map(
    regions.map((region) => [region.value, region.label]),
  );
  return {
    context,
    regions,
    locations: locations.map((location) => ({
      ...location,
      regionName: location.regionId
        ? (regionName.get(location.regionId) ?? null)
        : null,
    })),
    providers: (providers ?? []).filter(
      (row) => row.status === "INVITED" || row.status === "ACTIVE",
    ),
  };
});

/** Ein Standort der eigenen Organisation; fremde und unbekannte IDs ergeben eine 404 (vor dem Ladezustand). */
export async function requireLocation(
  slug: string,
  id: string,
  locale: Locale,
) {
  const data = await loadLocations(slug, locale);
  const location = data.locations.find((entry) => entry.id === id);
  if (!location) notFound();
  const providers: LinkedProviderRow[] = data.providers.filter(
    (row) => row.locationId === id,
  );
  return { ...data, location, providers };
}

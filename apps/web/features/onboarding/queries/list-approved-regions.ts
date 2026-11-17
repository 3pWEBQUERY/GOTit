import { pickLocalizedName, type Locale } from "@app/core/locale";
import { getDb } from "@app/db";

export interface RegionOption {
  id: string;
  name: string;
}

export interface CantonGroup extends RegionOption {
  cities: RegionOption[];
}

/**
 * Freigegebene Regionen für das Onboarding, nach Kanton gruppiert. Städte
 * stehen unter ihrem Kanton; eine Stadt ohne freigegebenen Kanton bildet eine
 * eigene Gruppe ohne Kantonsauswahl.
 */
export async function listApprovedRegions(locale: Locale): Promise<{ cantons: CantonGroup[]; looseCities: RegionOption[] }> {
  const rows = await getDb().region.findMany({
    where: { approved: true },
    select: {
      id: true,
      kind: true,
      parentId: true,
      nameDe: true,
      nameFr: true,
      nameIt: true,
      nameEn: true,
    },
  });
  const named = rows.map((row) => ({
    ...row,
    name: pickLocalizedName(row, locale),
  }));
  const collator = new Intl.Collator(locale);
  const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
  const cantons: CantonGroup[] = named
    .filter((row) => row.kind === "CANTON")
    .sort(byName)
    .map((canton) => ({
      id: canton.id,
      name: canton.name,
      cities: named
        .filter((row) => row.kind === "CITY" && row.parentId === canton.id)
        .sort(byName)
        .map(({ id, name }) => ({ id, name })),
    }));
  const cantonIds = new Set(cantons.map((canton) => canton.id));
  const looseCities = named
    .filter((row) => row.kind === "CITY" && (!row.parentId || !cantonIds.has(row.parentId)))
    .sort(byName)
    .map(({ id, name }) => ({ id, name }));
  return { cantons, looseCities };
}

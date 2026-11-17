import type { OrganizationKind } from "@app/db";

/** URL-Parameter von `/clubs` (v2 8.2: Filter stehen in der URL). */
export const KIND_PARAM = "art";
export const REGION_PARAM = "region";

const KINDS: Record<string, OrganizationKind> = {
  club: "CLUB",
  agentur: "AGENCY",
};

export interface ClubFilters {
  kind: OrganizationKind | null;
  region: string | null;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Liest die Filter; Unbekanntes fällt weg, statt einen Fehler zu zeigen. */
export function parseClubFilters(
  params: Record<string, string | string[] | undefined>,
  regionSlugs: readonly string[],
): ClubFilters {
  const kind = KINDS[first(params[KIND_PARAM]) ?? ""] ?? null;
  const region = first(params[REGION_PARAM]) ?? "";
  return { kind, region: regionSlugs.includes(region) ? region : null };
}

export function clubsQuery(filters: ClubFilters): string {
  const query = new URLSearchParams();
  if (filters.kind)
    query.set(KIND_PARAM, filters.kind === "CLUB" ? "club" : "agentur");
  if (filters.region) query.set(REGION_PARAM, filters.region);
  return query.toString();
}

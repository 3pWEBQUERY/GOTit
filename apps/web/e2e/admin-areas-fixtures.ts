import { randomUUID } from "node:crypto";
import { query } from "./admin-fixtures";

/**
 * Daten für die Specs der Admin-Bereiche (Schritt 1.13, Entscheid 0022):
 * erkennbar fiktive Regionen, Kategorien, Seiten und Anfragen mit eigenem
 * Präfix, damit `cleanupAreas` nur entfernt, was ein Test angelegt hat.
 */
export function suffix(): string {
  return randomUUID().slice(0, 8);
}

export async function createRegion(options: { kind: "CANTON" | "CITY"; parentId?: string; name: string }): Promise<{ id: string; slug: string }> {
  const id = `e2e_region_${randomUUID()}`;
  const slug = `e2e-${suffix()}`;
  await query(
    `insert into region (id, slug, kind, "parentId", "nameDe", "nameFr", "nameIt", "nameEn", "updatedAt") values ($1, $2, $3, $4, $5, $5, $5, $5, now())`,
    [id, slug, options.kind, options.parentId ?? null, options.name],
  );
  return { id, slug };
}

export async function regionState(id: string) {
  return (await query<{ approved: boolean; legalCheckedAt: Date | null }>(`select approved, "legalCheckedAt" from region where id = $1`, [id]))[0];
}

export async function deleteRegions(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await query(`delete from region where "parentId" = any($1)`, [ids]);
  await query(`delete from region where id = any($1)`, [ids]);
}

export async function auditFor(target: string, action?: string) {
  return query<{ action: string; actorId: string | null; reason: string | null }>(
    `select action, "actorId", reason from audit_event where target = $1 ${action ? "and action = $2" : ""} order by "createdAt" desc`,
    action ? [target, action] : [target],
  );
}

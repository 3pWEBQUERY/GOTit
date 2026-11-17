import { getDb } from "@app/db";
import { z } from "zod";
import { assertPermission } from "../admin/permissions";
import { requestSearchReindex } from "../search/reindex";

/**
 * Regionen verwalten (v1 9.5, v2 7.8 `/admin/regionen`). Eine Region wird erst
 * freigegeben, wenn jemand die rechtlichen und betrieblichen Voraussetzungen
 * geprüft und dokumentiert hat (`legalCheckedAt`), eine Stadt nur unter einem
 * freigegebenen Kanton.
 *
 * Suchindex: `SearchProfile.regionIds` und die Suchbegriffe enthalten nur
 * freigegebene Regionen (search/indexer). Jede Änderung der Freigabe stösst
 * deshalb die Aktualisierung der betroffenen Profile an. Einen Cache der
 * Regionen gibt es nicht (geo/service liest bei jeder Abfrage).
 */
const idSchema = z.string().min(1).max(64);
const reasonSchema = z.string().trim().min(10).max(500);
const noteSchema = z.string().trim().min(10).max(1000);
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((value) => (value ? value : null));
const nameSchema = z.string().trim().min(1).max(80);

export const regionRulesSchema = z.object({
  legalNote: optionalText,
  requiredPermits: optionalText,
  contentRestrictions: optionalText,
  featuredRank: z.number().int().min(1).max(999).nullable(),
  names: z.object({ nameDe: nameSchema, nameFr: nameSchema, nameIt: nameSchema, nameEn: nameSchema }).optional(),
});
export type RegionRulesInput = z.input<typeof regionRulesSchema>;

export type RegionAdminResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" | "not-checked" | "parent-not-approved" };

/** Alle Regionen als Baum (Kantone mit ihren Städten), mit Freigabe, Regeln und Zahl der Profile. */
export async function listRegionsForAdmin(actorId: string) {
  await assertPermission(actorId, "regions.manage");
  const db = getDb();
  const rows = await db.region.findMany({
    orderBy: [{ nameDe: "asc" }],
    select: {
      id: true,
      slug: true,
      kind: true,
      parentId: true,
      nameDe: true,
      nameFr: true,
      nameIt: true,
      nameEn: true,
      approved: true,
      featuredRank: true,
      legalNote: true,
      requiredPermits: true,
      contentRestrictions: true,
      legalCheckedAt: true,
      legalCheckedById: true,
      _count: { select: { providers: true } },
    },
  });
  const checkerIds = [...new Set(rows.map((row) => row.legalCheckedById).filter((id): id is string => Boolean(id)))];
  const checkers = checkerIds.length ? await db.user.findMany({ where: { id: { in: checkerIds } }, select: { id: true, username: true } }) : [];
  const names = new Map(checkers.map((checker) => [checker.id, checker.username]));
  const regions = rows.map(({ _count, ...row }) => ({
    ...row,
    providerCount: _count.providers,
    legalCheckedByUsername: row.legalCheckedById ? (names.get(row.legalCheckedById) ?? null) : null,
  }));
  type AdminRegion = (typeof regions)[number];
  const children = new Map<string, AdminRegion[]>();
  for (const region of regions) {
    if (!region.parentId) continue;
    children.set(region.parentId, [...(children.get(region.parentId) ?? []), region]);
  }
  const ids = new Set(regions.map((region) => region.id));
  // Wurzeln: Kantone und Regionen, deren Eltern fehlen.
  return regions
    .filter((region) => !region.parentId || !ids.has(region.parentId))
    .map((region) => ({ ...region, children: children.get(region.id) ?? [] }));
}

/** Profile in den Regionen neu indexieren (nach einer Änderung von Freigabe oder Namen). */
async function reindexRegions(regionIds: string[]): Promise<void> {
  const rows = await getDb().providerRegion.findMany({ where: { regionId: { in: regionIds } }, select: { providerProfileId: true }, distinct: ["providerProfileId"] });
  for (const row of rows) await requestSearchReindex(row.providerProfileId);
}

/**
 * Regeln, Hervorhebung und Namen ändern. Die dokumentierte Prüfung bleibt
 * bestehen; wer die Regeln wesentlich ändert, prüft mit `markRegionChecked`
 * erneut. Das Audit nennt nur die geänderten Felder.
 */
export async function updateRegionRules(actorId: string, regionId: string, input: RegionRulesInput): Promise<RegionAdminResult> {
  await assertPermission(actorId, "regions.manage");
  const parsed = regionRulesSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(regionId).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const region = await db.region.findUnique({ where: { id: regionId } });
  if (!region) return { ok: false, reason: "not-found" };
  const { names, ...rules } = parsed.data;
  const data = { ...rules, ...(names ?? {}) };
  const changed = (Object.keys(data) as (keyof typeof data)[]).filter((field) => region[field] !== data[field]);
  if (changed.length === 0) return { ok: true };
  await db.$transaction([
    db.region.update({ where: { id: regionId }, data }),
    db.auditEvent.create({ data: { actorId, action: "region.rules_changed", target: `region:${region.slug}`, reason: `Felder: ${changed.join(", ")}` } }),
  ]);
  if (names && region.approved && changed.some((field) => field.startsWith("name"))) await reindexRegions([regionId]);
  return { ok: true };
}

/** Dokumentiert die rechtliche und betriebliche Prüfung (Zeitpunkt, Person, Notiz im Audit). */
export async function markRegionChecked(actorId: string, regionId: string, note: string, now = new Date()): Promise<RegionAdminResult> {
  await assertPermission(actorId, "regions.manage");
  const parsedNote = noteSchema.safeParse(note);
  if (!parsedNote.success || !idSchema.safeParse(regionId).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const region = await db.region.findUnique({ where: { id: regionId }, select: { slug: true } });
  if (!region) return { ok: false, reason: "not-found" };
  await db.$transaction([
    db.region.update({ where: { id: regionId }, data: { legalCheckedAt: now, legalCheckedById: actorId } }),
    db.auditEvent.create({ data: { actorId, action: "region.legal_checked", target: `region:${region.slug}`, reason: parsedNote.data } }),
  ]);
  return { ok: true };
}

/**
 * Freigabe erteilen oder zurückziehen. Freigeben verlangt die dokumentierte
 * Prüfung und bei einer Stadt den freigegebenen Kanton. Zieht jemand die
 * Freigabe eines Kantons zurück, verlieren auch seine Städte die Freigabe
 * (je ein eigener Audit-Eintrag); sonst wären sie über Suche und Filter
 * weiter erreichbar. Gibt jemand den Kanton wieder frei, bleiben die Städte
 * zurückgezogen und brauchen je einen eigenen Entscheid.
 */
export async function setRegionApproved(actorId: string, regionId: string, approved: boolean, reason: string): Promise<RegionAdminResult> {
  await assertPermission(actorId, "regions.manage");
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success || !idSchema.safeParse(regionId).success || typeof approved !== "boolean") return { ok: false, reason: "invalid" };
  const db = getDb();
  const region = await db.region.findUnique({
    where: { id: regionId },
    select: { id: true, slug: true, approved: true, legalCheckedAt: true, parentId: true, parent: { select: { approved: true } } },
  });
  if (!region) return { ok: false, reason: "not-found" };
  if (approved) {
    if (!region.legalCheckedAt) return { ok: false, reason: "not-checked" };
    if (region.parentId && !region.parent?.approved) return { ok: false, reason: "parent-not-approved" };
  }
  if (region.approved === approved) return { ok: true };
  const affected = await db.$transaction(async (tx) => {
    const ids = [region.id];
    await tx.region.update({ where: { id: region.id }, data: { approved } });
    await tx.auditEvent.create({ data: { actorId, action: approved ? "region.approved" : "region.unapproved", target: `region:${region.slug}`, reason: parsedReason.data } });
    if (!approved) {
      const cities = await tx.region.findMany({ where: { parentId: region.id, approved: true }, select: { id: true, slug: true } });
      if (cities.length) {
        await tx.region.updateMany({ where: { id: { in: cities.map((city) => city.id) } }, data: { approved: false } });
        await tx.auditEvent.createMany({
          data: cities.map((city) => ({ actorId, action: "region.unapproved", target: `region:${city.slug}`, reason: `Freigabe des Kantons zurückgezogen: ${parsedReason.data}` })),
        });
        ids.push(...cities.map((city) => city.id));
      }
    } else {
      // Städte eines Kantons tragen dessen ID im Index nur, wenn der Kanton freigegeben ist.
      const cities = await tx.region.findMany({ where: { parentId: region.id }, select: { id: true } });
      ids.push(...cities.map((city) => city.id));
    }
    return ids;
  });
  await reindexRegions(affected);
  return { ok: true };
}

import { getDb, Prisma } from "@app/db";
import { z } from "zod";
import { assertPermission } from "../admin/permissions";
import { requestSearchReindex } from "../search/reindex";

/**
 * Kategorien verwalten (v1 9.5, v2 7.8 `/admin/kategorien`). Neue Kategorien
 * sind nicht freigegeben. Der Suchindex enthält nur freigegebene Kategorien
 * samt Namen (search/indexer); Freigabe und Namensänderungen stossen deshalb
 * die Aktualisierung der betroffenen Profile an. catalog/service hat keinen
 * Cache.
 */
const nameSchema = z.string().trim().min(1).max(60);
export const categoryInputSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  nameDe: nameSchema,
  nameFr: nameSchema,
  nameIt: nameSchema,
  nameEn: nameSchema,
  sortOrder: z.number().int().min(0).max(9999),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;
const reasonSchema = z.string().trim().min(10).max(500);

export type CategoryResult = { ok: true; id: string } | { ok: false; reason: "invalid" | "not-found" | "slug-taken" };

export async function listCategoriesForAdmin(actorId: string) {
  await assertPermission(actorId, "categories.manage");
  const rows = await getDb().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    select: { id: true, slug: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true, approved: true, sortOrder: true, updatedAt: true, _count: { select: { providers: true } } },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, providerCount: _count.providers }));
}

async function reindexCategory(categoryId: string): Promise<void> {
  const rows = await getDb().providerService.findMany({ where: { categoryId }, select: { providerProfileId: true } });
  for (const row of rows) await requestSearchReindex(row.providerProfileId);
}

/** Anlegen (ohne `id`, nicht freigegeben) oder ändern. Der Slug ist eindeutig. */
export async function upsertCategory(actorId: string, input: CategoryInput): Promise<CategoryResult> {
  await assertPermission(actorId, "categories.manage");
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { id, ...data } = parsed.data;
  const db = getDb();
  try {
    if (!id) {
      const created = await db.$transaction(async (tx) => {
        const row = await tx.category.create({ data, select: { id: true } });
        await tx.auditEvent.create({ data: { actorId, action: "category.created", target: `category:${data.slug}` } });
        return row;
      });
      return { ok: true, id: created.id };
    }
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return { ok: false, reason: "not-found" };
    const changed = (Object.keys(data) as (keyof typeof data)[]).filter((field) => existing[field] !== data[field]);
    if (changed.length === 0) return { ok: true, id };
    await db.$transaction([
      db.category.update({ where: { id }, data }),
      db.auditEvent.create({ data: { actorId, action: "category.updated", target: `category:${data.slug}`, reason: `Felder: ${changed.join(", ")}` } }),
    ]);
    if (existing.approved && changed.some((field) => field.startsWith("name"))) await reindexCategory(id);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, reason: "slug-taken" };
    throw error;
  }
}

export async function setCategoryApproved(actorId: string, id: string, approved: boolean, reason: string): Promise<CategoryResult> {
  await assertPermission(actorId, "categories.manage");
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success || typeof approved !== "boolean" || id.length === 0 || id.length > 64) return { ok: false, reason: "invalid" };
  const db = getDb();
  const category = await db.category.findUnique({ where: { id }, select: { slug: true, approved: true } });
  if (!category) return { ok: false, reason: "not-found" };
  if (category.approved === approved) return { ok: true, id };
  await db.$transaction([
    db.category.update({ where: { id }, data: { approved } }),
    db.auditEvent.create({ data: { actorId, action: approved ? "category.approved" : "category.unapproved", target: `category:${category.slug}`, reason: parsedReason.data } }),
  ]);
  await reindexCategory(id);
  return { ok: true, id };
}

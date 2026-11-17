import { getDb, Prisma, type ContentKind } from "@app/db";
import { z } from "zod";
import { assertPermission } from "../admin/permissions";
import { contentKindSchema, contentLocaleSchema, contentPageSchema, seoOverrideSchema, seoPathSchema, type ContentPageInput, type SeoOverrideInput } from "./schemas";

/**
 * Pflege von Hilfe, Rechtsseiten und Metadaten (v2 7.8, Recht `content.manage`).
 * Eine Seite gibt es pro Art, Slug und Sprache einmal. Es gibt keine getrennte
 * Entwurfsfassung einer veröffentlichten Seite: Speichern ändert sie sofort;
 * wer das nicht will, zieht sie vorher zurück. Das Audit nennt die Seite, nie
 * ihren Text.
 */
const idSchema = z.string().min(1).max(64);

const target = (page: { kind: ContentKind; slug: string; locale: string }) => `content:${page.kind.toLowerCase()}/${page.slug}/${page.locale}`;

export type ContentResult = { ok: true; id: string } | { ok: false; reason: "invalid" | "not-found" | "slug-taken" };

const listFilterSchema = z.object({ kind: contentKindSchema.optional(), locale: contentLocaleSchema.optional() });

export async function listContentPages(actorId: string, filter: z.input<typeof listFilterSchema> = {}) {
  await assertPermission(actorId, "content.manage");
  const parsed = listFilterSchema.safeParse(filter);
  if (!parsed.success) return [];
  return getDb().contentPage.findMany({
    where: parsed.data,
    orderBy: [{ kind: "asc" }, { slug: "asc" }, { locale: "asc" }],
    select: { id: true, kind: true, slug: true, locale: true, title: true, status: true, publishedAt: true, updatedAt: true, updatedById: true },
  });
}

export async function getContentPage(actorId: string, id: string) {
  await assertPermission(actorId, "content.manage");
  if (!idSchema.safeParse(id).success) return null;
  return getDb().contentPage.findUnique({ where: { id } });
}

/** Anlegen oder ändern. Neue Seiten sind Entwürfe, ausser mit `publish: true`. */
export async function saveContentPage(actorId: string, input: ContentPageInput, now = new Date()): Promise<ContentResult> {
  await assertPermission(actorId, "content.manage");
  const parsed = contentPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { id, publish, ...fields } = parsed.data;
  const db = getDb();
  try {
    return await db.$transaction(async (tx): Promise<ContentResult> => {
      const existing = id ? await tx.contentPage.findUnique({ where: { id }, select: { status: true, publishedAt: true } }) : null;
      if (id && !existing) return { ok: false, reason: "not-found" };
      const published = publish || existing?.status === "PUBLISHED";
      const data = {
        ...fields,
        updatedById: actorId,
        status: published ? ("PUBLISHED" as const) : ("DRAFT" as const),
        publishedAt: published ? (existing?.publishedAt ?? now) : (existing?.publishedAt ?? null),
      };
      const row = id ? await tx.contentPage.update({ where: { id }, data, select: { id: true } }) : await tx.contentPage.create({ data, select: { id: true } });
      await tx.auditEvent.create({ data: { actorId, action: "content.saved", target: target(fields) } });
      if (publish && existing?.status !== "PUBLISHED") await tx.auditEvent.create({ data: { actorId, action: "content.published", target: target(fields) } });
      return { ok: true, id: row.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, reason: "slug-taken" };
    throw error;
  }
}

export async function setContentPublished(actorId: string, id: string, published: boolean, now = new Date()): Promise<ContentResult> {
  await assertPermission(actorId, "content.manage");
  if (!idSchema.safeParse(id).success || typeof published !== "boolean") return { ok: false, reason: "invalid" };
  const db = getDb();
  const page = await db.contentPage.findUnique({ where: { id }, select: { kind: true, slug: true, locale: true, status: true } });
  if (!page) return { ok: false, reason: "not-found" };
  if ((page.status === "PUBLISHED") === published) return { ok: true, id };
  await db.$transaction([
    db.contentPage.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT", updatedById: actorId, ...(published ? { publishedAt: now } : {}) } }),
    db.auditEvent.create({ data: { actorId, action: published ? "content.published" : "content.unpublished", target: target(page) } }),
  ]);
  return { ok: true, id };
}

export async function deleteContentPage(actorId: string, id: string): Promise<ContentResult> {
  await assertPermission(actorId, "content.manage");
  if (!idSchema.safeParse(id).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const page = await db.contentPage.findUnique({ where: { id }, select: { kind: true, slug: true, locale: true } });
  if (!page) return { ok: false, reason: "not-found" };
  await db.$transaction([db.contentPage.delete({ where: { id } }), db.auditEvent.create({ data: { actorId, action: "content.deleted", target: target(page) } })]);
  return { ok: true, id };
}

export type SeoResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" };

export async function listSeoOverrides(actorId: string) {
  await assertPermission(actorId, "content.manage");
  return getDb().seoOverride.findMany({ orderBy: [{ path: "asc" }, { locale: "asc" }] });
}

export async function saveSeoOverride(actorId: string, input: SeoOverrideInput): Promise<SeoResult> {
  await assertPermission(actorId, "content.manage");
  const parsed = seoOverrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { path, locale, ...data } = parsed.data;
  const db = getDb();
  await db.$transaction([
    db.seoOverride.upsert({ where: { path_locale: { path, locale } }, create: { path, locale, ...data, updatedById: actorId }, update: { ...data, updatedById: actorId } }),
    db.auditEvent.create({ data: { actorId, action: "seo.saved", target: `seo:${locale}${path}` } }),
  ]);
  return { ok: true };
}

export async function deleteSeoOverride(actorId: string, path: string, locale: string): Promise<SeoResult> {
  await assertPermission(actorId, "content.manage");
  const parsedPath = seoPathSchema.safeParse(path);
  const parsedLocale = contentLocaleSchema.safeParse(locale);
  if (!parsedPath.success || !parsedLocale.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const deleted = await db.seoOverride.deleteMany({ where: { path: parsedPath.data, locale: parsedLocale.data } });
  if (deleted.count === 0) return { ok: false, reason: "not-found" };
  await db.auditEvent.create({ data: { actorId, action: "seo.deleted", target: `seo:${parsedLocale.data}${parsedPath.data}` } });
  return { ok: true };
}

import type { AccountViewer } from "@app/core/identity";
import { pickLocalizedName, type Locale } from "@app/core/locale";
import { getOwnProfileForEditor, getPublicProfile } from "@app/core/provider-profile";
import { getDb } from "@app/db";
import { cache } from "react";
import { listApprovedRegions } from "../../onboarding/queries/list-approved-regions";
import { toViewModel, type ProfileViewModel } from "../model";
import { regionHref } from "../region-href";

export interface RegionLink {
  name: string;
  href: string;
}

/**
 * Alles für den Editor, einmal pro Anfrage: Werte und Stand der Abschnitte,
 * das Profil im Online-Stand als Grundlage der Vorschau, Regionen und
 * Kategorien zur Auswahl. Nur das Profil der angemeldeten Person.
 */
export const loadEditor = cache(async (viewer: AccountViewer, locale: Locale) => {
  const editor = await getOwnProfileForEditor(viewer.userId);
  if (!editor) return null;
  const db = getDb();
  const [result, regionGroups, regionRows, categoryRows] = await Promise.all([
    getPublicProfile(editor.slug, viewer, { locale }),
    listApprovedRegions(locale),
    db.region.findMany({ where: { approved: true }, select: { id: true, slug: true, kind: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true, parent: { select: { slug: true } } } }),
    db.category.findMany({ where: { approved: true }, orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true } }),
  ]);
  if (!result || result.state === "members-only") return null;
  const base: ProfileViewModel = toViewModel(result.profile, { paused: result.state === "paused", regionHref: (region) => regionHref(locale, region) });
  const regionLinks: Record<string, RegionLink> = Object.fromEntries(
    regionRows.map((row) => [row.id, { name: pickLocalizedName(row, locale), href: regionHref(locale, { kind: row.kind, slug: row.slug, cantonSlug: row.parent?.slug ?? null }) }]),
  );
  const categories = categoryRows.map((row) => ({ id: row.id, name: pickLocalizedName(row, locale) }));
  return { editor, base, regionGroups, regionLinks, categories, publicState: result.state };
});

export type EditorData = NonNullable<Awaited<ReturnType<typeof loadEditor>>>;

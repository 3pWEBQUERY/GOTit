import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteContentPage, deleteSeoOverride, getPublishedPage, getSeoOverride, listPublishedHelp, saveContentPage, saveSeoOverride, setContentPublished } from "./index";

/** CMS gegen Postgres: Entwurf und Veröffentlichung, Rückfall auf Deutsch, Metadaten. */
const db = getDb();
const run = `${Date.now()}`;
const slug = `it-hilfe-${run}`;
const editor = `it_content_editor_${run}`;
const seoPath = `/it-${run}/zuerich`;

beforeAll(async () => {
  await db.user.create({ data: { id: editor, name: "Fiktiv", email: `${editor}@fiktiv.test`, twoFactorEnabled: true } });
  await db.internalRoleAssignment.create({ data: { userId: editor, role: "CONTENT_EDITOR", grantedBy: "test" } });
});

afterAll(async () => {
  await db.contentPage.deleteMany({ where: { slug: { startsWith: `it-hilfe-${run}` } } });
  await db.seoOverride.deleteMany({ where: { path: seoPath } });
  await db.auditEvent.deleteMany({ where: { actorId: editor } });
  await db.user.deleteMany({ where: { id: editor } });
});

const body = "Geheimer Entwurfstext, der nicht ins Audit gehört.";

describe("Seiten", () => {
  let deId = "";

  it("hält Entwürfe aus der Öffentlichkeit und veröffentlicht auf Wunsch", async () => {
    const saved = await saveContentPage(editor, { kind: "HELP", slug, locale: "de", title: "Zzz Fiktive Hilfe", summary: "Kurz", body });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    deId = saved.id;
    expect(await getPublishedPage("HELP", slug, "de")).toBeNull();
    expect((await listPublishedHelp("de")).some((page) => page.slug === slug)).toBe(false);
    expect(await setContentPublished(editor, deId, true)).toEqual({ ok: true, id: deId });
    expect((await getPublishedPage("HELP", slug, "de"))?.page.body).toBe(body);
    expect(await saveContentPage(editor, { kind: "HELP", slug, locale: "de", title: "Doppelt", body })).toEqual({ ok: false, reason: "slug-taken" });
    expect(await saveContentPage(editor, { kind: "HELP", slug: "Gross Schreibung", locale: "de", title: "x", body })).toEqual({ ok: false, reason: "invalid" });
    expect(await saveContentPage(editor, { kind: "HELP", slug, locale: "es" as never, title: "x", body })).toEqual({ ok: false, reason: "invalid" });
  });

  it("fällt ohne Übersetzung auf Deutsch zurück und nimmt die Übersetzung, sobald sie veröffentlicht ist", async () => {
    const fallback = await getPublishedPage("HELP", slug, "fr");
    expect(fallback).toMatchObject({ locale: "de", fallback: true });
    const fr = await saveContentPage(editor, { kind: "HELP", slug, locale: "fr", title: "Aide fictive", body: "Texte", publish: true });
    expect(fr.ok).toBe(true);
    expect(await getPublishedPage("HELP", slug, "fr")).toMatchObject({ locale: "fr", fallback: false });
    const help = await listPublishedHelp("fr");
    expect(help.find((page) => page.slug === slug)?.title).toBe("Aide fictive");
    expect((await listPublishedHelp("it")).find((page) => page.slug === slug)?.locale).toBe("de");
    if (fr.ok) expect(await setContentPublished(editor, fr.id, false)).toEqual({ ok: true, id: fr.id });
    expect(await getPublishedPage("HELP", slug, "fr")).toMatchObject({ locale: "de" });
  });

  it("protokolliert ohne Text und löscht", async () => {
    expect(await deleteContentPage(editor, deId)).toEqual({ ok: true, id: deId });
    expect(await getPublishedPage("HELP", slug, "de")).toBeNull();
    const audit = await db.auditEvent.findMany({ where: { actorId: editor, target: { startsWith: "content:" } }, select: { action: true, target: true, reason: true } });
    expect(audit.map((row) => row.action)).toEqual(expect.arrayContaining(["content.saved", "content.published", "content.unpublished", "content.deleted"]));
    expect(audit.some((row) => row.target === `content:help/${slug}/de`)).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("Geheimer");
  });
});

describe("Metadaten", () => {
  it("speichert, liefert öffentlich und lehnt Pfade mit Query ab", async () => {
    expect(await saveSeoOverride(editor, { path: `${seoPath}?a=1`, locale: "de", noindex: false })).toEqual({ ok: false, reason: "invalid" });
    expect(await saveSeoOverride(editor, { path: "ohne-slash", locale: "de", noindex: false })).toEqual({ ok: false, reason: "invalid" });
    expect(await saveSeoOverride(editor, { path: seoPath, locale: "de", title: "Titel", description: "Beschreibung", noindex: true })).toEqual({ ok: true });
    expect(await getSeoOverride(seoPath, "de")).toEqual({ title: "Titel", description: "Beschreibung", noindex: true });
    expect(await getSeoOverride(seoPath, "fr")).toBeNull();
    expect(await deleteSeoOverride(editor, seoPath, "de")).toEqual({ ok: true });
    expect(await deleteSeoOverride(editor, seoPath, "de")).toEqual({ ok: false, reason: "not-found" });
  });
});

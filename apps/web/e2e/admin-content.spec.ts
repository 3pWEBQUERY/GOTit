import { suffix } from "./admin-areas-fixtures";
import { cleanup, query, signInAdmin } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Inhalte und SEO (v1 9.6, v2 7.8): Ein Entwurf ist nicht öffentlich, nach
 * dem Veröffentlichen steht er unter /hilfe/[slug]; ein SEO-Eintrag ersetzt
 * den Titel; Löschen verlangt eine Rückfrage.
 */
const users: string[] = [];
let slug = "";
test.afterEach(async () => {
  if (slug) {
    await query(`delete from content_page where slug = $1`, [slug]);
    await query(`delete from seo_override where path like $1`, [`%/${slug}`]);
  }
  await cleanup(users.splice(0));
});

test.describe("Inhalte im Admin", () => {
  test("Entwurf bleibt privat, veröffentlicht steht er unter /hilfe", async ({ page, browser, baseURL }) => {
    users.push((await signInAdmin(page, baseURL, "CONTENT_EDITOR")).id);
    slug = `e2e-hilfe-${suffix()}`;
    await page.goto("/de/admin/inhalte");
    await expect(page.getByRole("table", { name: "Seiten nach Art, Slug und Sprache" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("link", { name: "Seite anlegen" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Neue Seite" })).toBeVisible();
    await page.getByRole("button", { name: "Seite anlegen" }).click();
    await expect(page.getByText("Titel: Dieses Feld fehlt.")).toBeVisible();
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Titel", { exact: true }).fill("Zz Testhilfe Fiktiv");
    await page.getByLabel(/^Kurztext/).fill("Ein Artikel nur für den Test.");
    await page.getByLabel("Text", { exact: true }).fill("## Abschnitt\n\nErster Absatz mit **fett** und [Link](/de/kontakt).\n\n- eins\n- zwei\n\n<script>alert(1)</script>");
    await page.getByRole("tab", { name: "Vorschau" }).click();
    const preview = page.locator("[data-content-preview]");
    await expect(preview.getByRole("heading", { level: 2, name: "Abschnitt" })).toBeVisible();
    await expect(preview.getByRole("link", { name: "Link" })).toHaveAttribute("href", "/de/kontakt");
    await expect(preview.locator("script")).toHaveCount(0);
    await expect(preview).toContainText("<script>alert(1)</script>");
    await expect(page.getByText(/von 70 Zeichen/)).toBeVisible();
    await page.getByRole("button", { name: "Seite anlegen" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Zz Testhilfe Fiktiv" })).toBeVisible();
    await expect(page.locator("[data-content-status]")).toContainText("Entwurf, nicht öffentlich");
    await expectNoSeriousAxeFindings(page);

    const visitor = await (await browser.newContext({ baseURL })).newPage();
    expect((await visitor.goto(`/de/hilfe/${slug}`))?.status()).toBe(404);

    await page.getByRole("button", { name: "Veröffentlichen" }).click();
    await expect(page.locator("[data-content-status]")).toContainText("Veröffentlicht seit");
    await expect(page.getByText("Diese Seite ist veröffentlicht")).toBeVisible();

    expect((await visitor.goto(`/de/hilfe/${slug}`))?.status()).toBe(200);
    await expect(visitor.getByRole("heading", { level: 1, name: "Zz Testhilfe Fiktiv" })).toBeVisible();
    await expect(visitor.getByText(/^Stand: \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
    await expect(visitor.locator("[data-markdown] script")).toHaveCount(0);
    await visitor.goto("/de/hilfe");
    await expect(visitor.getByRole("link", { name: "Zz Testhilfe Fiktiv" })).toBeVisible();
    await visitor.goto(`/fr/aide/${slug}`);
    await expect(visitor.getByText("Cette page n’existe pas encore dans ta langue")).toBeVisible();
    await expect(visitor.locator(`[data-content-article="${slug}"]`)).toHaveAttribute("lang", "de");

    // SEO-Eintrag ersetzt den Titel der Seite.
    await page.goto("/de/admin/seo");
    const seo = page.locator('[data-admin-form="seo"]');
    await seo.getByLabel("Pfad").fill(`/de/hilfe/${slug}`);
    await seo.getByLabel(/^Titel/).fill("Eigener Titel aus dem Test");
    await seo.getByRole("button", { name: "Eintrag speichern" }).click();
    await expect(page.getByRole("table", { name: "Einträge nach Pfad" })).toContainText(`/de/hilfe/${slug}`);
    await expectNoSeriousAxeFindings(page);
    await visitor.goto(`/de/hilfe/${slug}`);
    await expect(visitor).toHaveTitle(/Eigener Titel aus dem Test/);

    // Löschen mit Rückfrage; danach 404.
    await page.goto("/de/admin/inhalte");
    await page.locator(`[data-content-link="HELP/${slug}/de"]`).locator("visible=true").click();
    await page.getByRole("button", { name: "Seite löschen" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Zz Testhilfe Fiktiv löschen?" });
    await expect(dialog).toContainText("verschwindet sofort");
    await dialog.getByRole("button", { name: "Seite löschen" }).click();
    await expect(page).toHaveURL(/\/de\/admin\/inhalte$/);
    expect((await visitor.goto(`/de/hilfe/${slug}`))?.status()).toBe(404);
    await visitor.context().close();
  });
});

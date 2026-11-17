import { auditFor, createRegion, deleteRegions, regionState, suffix } from "./admin-areas-fixtures";
import { cleanup, query, signInAdmin } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Regionen und Kategorien (v1 9.5): Freigabe erst nach dokumentierter
 * Prüfung, Stadt erst unter freigegebenem Kanton, Zurückziehen des Kantons
 * zieht seine Städte mit. Kategorien anlegen und freigeben.
 */
const users: string[] = [];
const regions: string[] = [];
test.afterEach(async () => {
  await deleteRegions(regions.splice(0));
  await cleanup(users.splice(0));
});

test.describe("Regionen und Kategorien", () => {
  test("Freigabe verlangt die rechtliche Prüfung und den freigegebenen Kanton", async ({ page, baseURL }) => {
    users.push((await signInAdmin(page, baseURL, "PLATFORM_ADMIN")).id);
    const name = `Zz Testkanton ${suffix()}`;
    const canton = await createRegion({ kind: "CANTON", name });
    const city = await createRegion({ kind: "CITY", parentId: canton.id, name: `${name} Stadt` });
    regions.push(canton.id);

    await page.goto("/de/admin/regionen");
    await expect(page.getByRole("table", { name: "Kantone und ihre Städte" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.goto(`/de/admin/regionen?region=${city.id}`);
    const cityEditor = page.locator(`[data-region-editor="${city.slug}"]`);
    await expect(cityEditor.getByText("Erst rechtlich prüfen")).toBeVisible();

    await page.goto(`/de/admin/regionen?region=${canton.id}`);
    const editor = page.locator(`[data-region-editor="${canton.slug}"]`);
    await expect(editor.getByText("Erst rechtlich prüfen: Ohne dokumentierte Prüfung")).toBeVisible();
    const approve = editor.locator(`[data-admin-form="freigabe-${canton.slug}"]`);
    await approve.getByLabel("Begründung").fill("Kanton für den Start vorgesehen.");
    await approve.getByRole("button", { name: "Region freigeben" }).click();
    await expect(approve.getByText("Erst rechtlich prüfen: Markiere die Region als geprüft")).toBeVisible();
    expect((await regionState(canton.id))?.approved).toBe(false);

    const check = editor.locator(`[data-admin-form="pruefung-${canton.slug}"]`);
    await check.getByLabel("Notiz zur Prüfung").fill("Rechtsgutachten vom Test geprüft, keine Bewilligungspflicht.");
    await check.getByRole("button", { name: "Als geprüft markieren" }).click();
    await expect(editor.getByText(/Rechtlich geprüft am \d{2}\.\d{2}\.\d{4} von/)).toBeVisible();

    await approve.getByLabel("Begründung").fill("Kanton für den Start vorgesehen.");
    await approve.getByRole("button", { name: "Region freigeben" }).click();
    await expect(editor.locator(`[data-admin-form="freigabe-${canton.slug}"]`).getByRole("button", { name: "Freigabe zurückziehen" })).toBeVisible();
    expect((await regionState(canton.id))?.approved).toBe(true);

    // Die Stadt: geprüft, Kanton freigegeben, dann frei.
    await query(`update region set "legalCheckedAt" = now() where id = $1`, [city.id]);
    await page.goto(`/de/admin/regionen?region=${city.id}`);
    const cityApprove = page.locator(`[data-admin-form="freigabe-${city.slug}"]`);
    await cityApprove.getByLabel("Begründung").fill("Stadt nach Prüfung freigeben.");
    await cityApprove.getByRole("button", { name: "Region freigeben" }).click();
    await expect(page.locator(`[data-admin-form="freigabe-${city.slug}"]`).getByRole("button", { name: "Freigabe zurückziehen" })).toBeVisible();

    // Zurückziehen des Kantons zieht die Stadt mit.
    await page.goto(`/de/admin/regionen?region=${canton.id}`);
    await expect(page.getByText("Zieht auch die Freigabe einer Stadt zurück.")).toBeVisible();
    const withdraw = page.locator(`[data-admin-form="freigabe-${canton.slug}"]`);
    await withdraw.getByLabel("Begründung").fill("Rechtslage hat sich geändert, vorerst nicht.");
    await withdraw.getByRole("button", { name: "Freigabe zurückziehen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Freigabe zurückziehen" }).click();
    await expect(page.locator(`[data-admin-form="freigabe-${canton.slug}"]`).getByRole("button", { name: "Region freigeben" })).toBeVisible();
    expect((await regionState(city.id))?.approved).toBe(false);
    expect((await auditFor(`region:${city.slug}`, "region.unapproved"))[0]?.reason).toContain("Freigabe des Kantons zurückgezogen");
    await expectNoSeriousAxeFindings(page);
  });

  test("Kategorie anlegen, freigeben und ohne Recht nicht sehen", async ({ page, baseURL }) => {
    users.push((await signInAdmin(page, baseURL, "PLATFORM_ADMIN")).id);
    const slug = `e2e-${suffix()}`;
    try {
      await page.goto("/de/admin/kategorien");
      await page.getByRole("link", { name: "Kategorie anlegen" }).click();
      await expect(page).toHaveURL(/bearbeiten=neu/);
      const form = page.locator('[data-admin-form="kategorie"]');
      await form.getByRole("button", { name: "Kategorie anlegen" }).click();
      await expect(form.getByText("Name Deutsch: Dieses Feld fehlt.")).toBeVisible();
      await form.getByLabel("Slug").fill("Gross Schreibung");
      await form.getByLabel("Name Deutsch").fill("Zz Testkategorie");
      await form.getByLabel("Name Französisch").fill("Catégorie test");
      await form.getByLabel("Name Italienisch").fill("Categoria test");
      await form.getByLabel("Name Englisch").fill("Test category");
      await form.getByRole("button", { name: "Kategorie anlegen" }).click();
      await expect(form.getByText("Nur Kleinbuchstaben, Ziffern und Bindestriche.").first()).toBeVisible();
      await form.getByLabel("Slug").fill(slug);
      await form.getByRole("button", { name: "Kategorie anlegen" }).click();
      await expect(page).toHaveURL(/bearbeiten=(?!neu)/);
      const approve = page.locator('[data-admin-form="kategorie-freigabe"]');
      await approve.getByLabel("Begründung").fill("Kategorie für den Start freigeben.");
      await approve.getByRole("button", { name: "Kategorie freigeben" }).click();
      await expect(page.locator(`[data-category-edit="${slug}"]`).locator("xpath=ancestor::tr")).toContainText("Freigegeben");
      await expectNoSeriousAxeFindings(page);
    } finally {
      await query(`delete from category where slug = $1`, [slug]);
    }
  });
});

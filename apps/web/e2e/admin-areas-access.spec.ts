import { cleanup, signInAdmin, type InternalRole } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Abnahme v1 20.6 «Rollenrechte werden in jedem API-Endpunkt geprüft» in der
 * Oberfläche: Jeder neue Bereich zeigt ohne Recht den Hinweis statt Daten,
 * und die Seitenleiste zeigt nur Bereiche mit Recht (Entscheid 0022).
 */
const created: string[] = [];
test.afterEach(async () => {
  await cleanup(created.splice(0));
});

const RESTRICTED: Record<string, { role: InternalRole; paths: string[] }> = {
  Support: { role: "SUPPORT", paths: ["/de/admin/regionen", "/de/admin/kategorien", "/de/admin/inhalte", "/de/admin/inhalte/neu", "/de/admin/seo", "/de/admin/system/flags", "/de/admin/system/audit", "/de/admin/system/status"] },
  Moderation: { role: "MODERATOR", paths: ["/de/admin/system/rollen", "/de/admin/support", "/de/admin/support/unbekannt", "/de/admin/system/flags"] },
  Redaktion: { role: "CONTENT_EDITOR", paths: ["/de/admin/benutzer", "/de/admin/benutzer/unbekannt", "/de/admin/anbieter", "/de/admin/regionen", "/de/admin/system/rollen"] },
};

test.describe("Rechte der Admin-Bereiche", () => {
  for (const [label, { role, paths }] of Object.entries(RESTRICTED)) {
    test(`${label} sieht in fremden Bereichen den Hinweis statt Daten`, async ({ page, baseURL }) => {
      created.push((await signInAdmin(page, baseURL, role)).id);
      for (const path of paths) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.getByText("Kein Zugriff mit deiner Rolle"), path).toBeVisible();
        await expect(page.getByRole("link", { name: "Zur Übersicht wechseln" })).toHaveAttribute("href", "/de/admin");
        await expect(page.getByRole("table"), path).toHaveCount(0);
        await expect(page.locator("form[data-admin-form]"), path).toHaveCount(0);
      }
      await expectNoSeriousAxeFindings(page);
    });
  }

  test("die Seitenleiste zeigt der Redaktion nur ihre Bereiche", async ({ page, baseURL }) => {
    created.push((await signInAdmin(page, baseURL, "CONTENT_EDITOR")).id);
    await page.goto("/de/admin");
    const nav = page.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(nav.getByRole("link")).toHaveText(["Übersicht", "Inhalte", "SEO"]);
  });

  test("Plattform-Administration sieht alle Bereiche in der Reihenfolge der PRD", async ({ page, baseURL }) => {
    created.push((await signInAdmin(page, baseURL, "SUPER_ADMIN")).id);
    await page.goto("/de/admin");
    const nav = page.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(nav.getByRole("link")).toHaveText([/^Übersicht/, /^Benutzer/, /^Anbieter/, /^Unternehmen/, /^Verifizierungen/, /^Medien/, /^Moderation/, /^Bewertungen/, /^Regionen/, /^Kategorien/, /^Inhalte/, /^SEO/, /^Support/, /^System/]);
    await nav.getByRole("link", { name: /^System/ }).click();
    await expect(page).toHaveURL(/\/de\/admin\/system\/flags$/);
    await expect(nav.getByRole("link", { name: /^System/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "Bereiche des Systems" }).getByRole("link")).toHaveText(["Feature Flags", "Interne Rollen", "Audit-Log", "Dienststatus"]);
  });

  test("die alte Adresse der Organisationen führt dauerhaft zu Unternehmen", async ({ page, baseURL }) => {
    created.push((await signInAdmin(page, baseURL, "MODERATOR")).id);
    const response = await page.request.get("/de/admin/organisationen", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toMatch(/\/de\/admin\/unternehmen$/);
    await page.goto("/de/admin/organisationen");
    await expect(page).toHaveURL(/\/de\/admin\/unternehmen$/);
    await expect(page.getByRole("heading", { level: 1, name: "Unternehmen" })).toBeVisible();
  });
});

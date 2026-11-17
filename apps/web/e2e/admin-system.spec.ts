import { cleanup, createAccount, query, signInAdmin } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * System (v2 7.8): Rollen nur durch Super Admin mit Begründung, die Änderung
 * im Audit-Log, Flags mit Pflichtbegründung, Dienststatus.
 */
const users: string[] = [];
test.afterEach(async () => {
  await cleanup(users.splice(0));
});

test.describe("System im Admin", () => {
  test("Rollenänderung steht im Audit-Log", async ({ page, baseURL }) => {
    users.push((await signInAdmin(page, baseURL, "SUPER_ADMIN")).id);
    const target = await createAccount(undefined, "Neue Supporterin Fiktiv");
    users.push(target.id);
    const username = `support_${target.id.slice(-8)}`;
    await query(`update "user" set username = $2 where id = $1`, [target.id, username]);

    await page.goto("/de/admin/system/rollen");
    await expect(page.getByRole("table", { name: "Konten mit interner Rolle" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("searchbox", { name: "Suche" }).fill(username);
    await page.getByRole("button", { name: "Konto suchen" }).click();
    await page.getByRole("link", { name: username }).click();
    await expect(page.getByRole("heading", { level: 2, name: `Rollen von ${username}` })).toBeVisible();
    const form = page.locator(`[data-admin-form="rollen-${target.id}"]`);
    await form.getByRole("checkbox", { name: "Support" }).click();
    await form.getByRole("button", { name: "Rollen speichern" }).click();
    await expect(form.getByText("Begründung: Dieses Feld fehlt.")).toBeVisible();
    await form.getByLabel("Begründung").fill("Neue Mitarbeiterin im Support ab heute.");
    await form.getByRole("button", { name: "Rollen speichern" }).click();
    await expect(page.locator(`[data-roles-edit="${target.id}"]`).locator("xpath=ancestor::tr")).toContainText("Support");
    expect((await query(`select role from internal_role_assignment where "userId" = $1`, [target.id])).map((row) => (row as { role: string }).role)).toEqual(["SUPPORT"]);

    await page.goto(`/de/admin/system/audit?aktion=user.roles_changed&ziel=${encodeURIComponent(`user:${target.id}`)}`);
    const audit = page.getByRole("table", { name: "Einträge des Audit-Logs" });
    await expect(audit.getByRole("row")).toHaveCount(2);
    await expect(audit).toContainText("user.roles_changed");
    await expect(audit).toContainText("Neue Mitarbeiterin im Support ab heute. (vorher: keine; nachher: SUPPORT)");
    await expectNoSeriousAxeFindings(page);
  });

  test("Flags verlangen eine Begründung; der Dienststatus zeigt jeden Dienst", async ({ page, baseURL }) => {
    users.push((await signInAdmin(page, baseURL, "PLATFORM_ADMIN")).id);
    await page.goto("/de/admin/system/flags");
    await expect(page.getByRole("heading", { level: 2, name: "Community" })).toBeVisible();
    await expect(page.getByText(/^Phase 3:/)).toBeVisible();
    await expect(page.getByText(/^Phase 2:/)).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    const form = page.locator('[data-admin-form="flag-form-community"]');
    await form.getByRole("button", { name: "Flag speichern" }).click();
    await expect(form.getByText("Begründung: Dieses Feld fehlt.")).toBeVisible();

    await page.goto("/de/admin/system/status");
    const services = page.getByRole("table", { name: "Dienste" });
    await expect(services.getByRole("row", { name: /Postgres/ })).toContainText("Antwortet");
    await expect(services.getByRole("row", { name: /Migrationen/ })).toContainText("angewendet");
    await expect(page.getByRole("table", { name: "Queues" }).getByRole("row")).not.toHaveCount(1);
    await page.getByRole("button", { name: "Erneut prüfen" }).click();
    await expect(page.getByText(/^Geprüft /)).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });
});

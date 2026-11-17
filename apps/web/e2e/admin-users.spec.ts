import { auditFor } from "./admin-areas-fixtures";
import { cleanup, createAccount, query, signInAdmin, signInAs } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Benutzer (v1 9.2, v2 7.8): Suche, Detail, Einschränken, Sperren mit
 * Rückfrage und Aufheben. Eine Sperre beendet die Sitzungen des Kontos.
 */
const created: string[] = [];
test.afterEach(async () => {
  await cleanup(created.splice(0));
});

test.describe("Benutzer im Admin", () => {
  test("Sperren aus der Detailansicht beendet die Sitzung des Kontos", async ({ page, browser, baseURL }) => {
    const admin = await signInAdmin(page, baseURL, "TRUST_SAFETY");
    const target = await createAccount(undefined, "Gesperrt Fiktiv");
    created.push(admin.id, target.id);
    const username = `gesperrt_${target.id.slice(-8)}`;
    await query(`update "user" set username = $2 where id = $1`, [target.id, username]);
    const targetContext = await browser.newContext({ baseURL });
    const targetPage = await targetContext.newPage();
    await signInAs(targetPage, target, baseURL);
    expect(await (await targetPage.request.get("/api/auth/get-session")).json()).toBeTruthy();

    await page.goto(`/de/admin/benutzer?q=${encodeURIComponent(target.email)}`);
    await expect(page.getByRole("status").filter({ hasText: "Ein Konto" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.locator(`[data-user-link="${target.id}"]`).locator("visible=true").click();
    await expect(page.getByRole("heading", { level: 2, name: "Einschränkungen und Sperren" })).toBeVisible();
    await expect(page.getByText("Gegen dieses Konto gab es noch keine Massnahme.")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    const form = page.locator("[data-suspend-form]");
    await form.getByRole("button", { name: "Konto sperren" }).click();
    await expect(form.getByText("Regel: Dieses Feld fehlt.")).toBeVisible();
    await form.getByRole("combobox", { name: "Regel" }).click();
    await page.getByRole("option", { name: /^R-MOD-2 / }).click();
    await form.getByLabel("Begründung").fill("Wiederholte Täuschung über Preise, siehe Fall im Test.");
    await form.getByRole("button", { name: "Konto sperren" }).click();
    const dialog = page.getByRole("alertdialog", { name: `${username} sperren?` });
    await expect(dialog).toContainText("Alle Sitzungen enden sofort");
    await dialog.getByRole("button", { name: "Konto sperren" }).click();
    await expect(page.getByText("Das Konto ist gesperrt. Alle Sitzungen sind beendet.").first()).toBeVisible();
    await expect(page.getByText("Dieses Konto ist gesperrt", { exact: true })).toBeVisible();

    await expect(async () => {
      expect(await (await targetPage.request.get("/api/auth/get-session")).json()).toBeFalsy();
    }).toPass({ timeout: 10_000 });
    expect((await query(`select count(*)::int as count from session where "userId" = $1`, [target.id]))[0]).toEqual({ count: 0 });
    expect((await auditFor(`user:${target.id}`, "account.restricted.suspended"))[0]?.reason).toContain("R-MOD-2");
    await targetContext.close();

    const lift = page.locator("[data-lift]");
    await lift.getByLabel("Begründung").fill("Einspruch geprüft, Sperre war zu streng.");
    await lift.getByRole("button", { name: "Massnahme aufheben" }).click();
    await expect(page.getByText("Die Massnahme ist aufgehoben.").first()).toBeVisible();
    await expect(page.getByText("Dieses Konto ist gesperrt", { exact: true })).toHaveCount(0);
  });

  test("Einschränken mit Ende; Support sieht das Konto ohne Massnahmen", async ({ page, browser, baseURL }) => {
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    const target = await createAccount(undefined, "Eingeschränkt Fiktiv");
    created.push(moderator.id, target.id);
    await page.goto(`/de/admin/benutzer/${target.id}`);
    await expect(page.locator("[data-suspend-form]")).toHaveCount(0);
    const form = page.locator("[data-restrict-form]");
    await form.getByRole("radio", { name: /Nachrichten eingeschränkt/ }).click();
    await form.getByRole("combobox", { name: "Regel" }).click();
    await page.getByRole("option", { name: /^R-MOD-1 / }).click();
    await form.getByLabel("Begründung").fill("Beleidigende Nachrichten an mehrere Mitglieder.");
    const next = new Date(Date.now() + 10 * 24 * 3600_000);
    const swiss = `${String(next.getDate()).padStart(2, "0")}.${String(next.getMonth() + 1).padStart(2, "0")}.${next.getFullYear()}`;
    await form.getByRole("textbox", { name: /^Ende/ }).fill(swiss);
    await form.getByRole("button", { name: "Konto einschränken" }).click();
    await expect(page.getByText("Das Konto ist eingeschränkt.").first()).toBeVisible();
    const table = page.getByRole("table", { name: "Einschränkungen und Sperren" });
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("Nachrichten eingeschränkt");
    await expect(table).toContainText("Gilt");

    const supportContext = await browser.newContext({ baseURL });
    const support = await supportContext.newPage();
    created.push((await signInAdmin(support, baseURL, "SUPPORT")).id);
    await support.goto(`/de/admin/benutzer/${target.id}`);
    await expect(support.getByRole("heading", { level: 1, name: "Ohne Benutzername" })).toBeVisible();
    await expect(support.getByRole("table", { name: "Einschränkungen und Sperren" })).toContainText("Nachrichten eingeschränkt");
    await expect(support.locator("[data-restrict-form], [data-suspend-form], [data-lift]")).toHaveCount(0);
    await expect(support.getByText("Rollen vergibt nur ein Super Admin.")).toBeVisible();
    await supportContext.close();
  });
});

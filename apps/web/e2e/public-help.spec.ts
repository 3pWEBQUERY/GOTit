import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Hilfe und Rechtsseiten aus dem CMS (v2 7.3): Liste, Artikel mit «Stand»,
 * Rückfall auf Deutsch, 404 für Unbekanntes; 375 px ohne horizontales Scrollen.
 */
test.describe("Hilfe und Recht", () => {
  test("Hilfe listet Artikel, ein Artikel zeigt Stand und Text", async ({ page }) => {
    await page.goto("/de/hilfe");
    await expect(page.getByRole("heading", { level: 1, name: "Hilfe und Antworten" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.locator("[data-help-list]").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/de\/hilfe\/[a-z0-9-]+$/);
    await expect(page.getByText(/^Stand: \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
    await expect(page.locator("[data-markdown]")).not.toBeEmpty();
    await expectNoSeriousAxeFindings(page);
    expect((await page.goto("/de/hilfe/gibt-es-nicht"))?.status()).toBe(404);
    expect((await page.goto("/de/hilfe/UNGUELTIG"))?.status()).toBe(404);
  });

  test("ohne Übersetzung erscheint die deutsche Fassung mit Hinweis", async ({ page }) => {
    await page.goto("/en/help/termine");
    await expect(page.getByText("This page is not available in your language yet")).toBeVisible();
    await expect(page.locator('[data-content-article="termine"]')).toHaveAttribute("lang", "de");
    await expectNoSeriousAxeFindings(page);
  });

  test("Rechtsseiten zeigen den Platzhalter mit Stand", async ({ page }) => {
    for (const path of ["/de/recht/agb", "/de/recht/datenschutz", "/de/recht/impressum", "/de/recht/richtlinien", "/fr/legal/cgu"]) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      await expect(page.getByText("Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.").first(), path).toBeVisible();
      await expect(page.getByText(/^(Stand|État) ?: \d{2}\.\d{2}\.\d{4}$/), path).toBeVisible();
    }
    await expectNoSeriousAxeFindings(page);
  });

  test("öffentliche Seiten bei 375 px ohne horizontales Scrollen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of ["/de/hilfe", "/de/hilfe/termine", "/de/kontakt", "/de/melden", "/de/recht/agb"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
    await expectNoSeriousAxeFindings(page);
  });
});

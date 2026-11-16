import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge, signIn } from "./support/session";

test.describe("Altersprüfung (PRD 7.1, 8)", () => {
  test("führt Besucher vor dem Marktplatz zur Altersprüfung und danach zurück zum Ziel", async ({ page }) => {
    await page.goto("/de");
    await expect(page).toHaveURL(/\/de\/alterspruefung\?weiter=%2Fde$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bist du mindestens 18 Jahre alt?");
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Alter bestätigen" }).click();
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Profile in");
  });

  test("leitet nach der Bestätigung nie auf fremde Seiten weiter", async ({ page }) => {
    await page.goto("/de/alterspruefung?weiter=https://boese.example/");
    await page.getByRole("button", { name: "Alter bestätigen" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/de$/);
  });

  test("Informationsseiten sind ohne Altersprüfung erreichbar", async ({ page }) => {
    await page.goto("/de/fuer-anbieter");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/de\/fuer-anbieter$/);
  });
});

test.describe("Mega-Menü (PRD 6.3)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("ist allein mit der Tastatur bedienbar", async ({ page }) => {
    await confirmAge(page);
    const trigger = page.getByRole("button", { name: "Entdecken", exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`);
    await expect(panel.getByRole("link", { name: "Zürich" })).toBeVisible();
    await expect(panel.locator("[role=menu]")).toHaveCount(0);
    expect(await panel.locator("ul").first().locator("li").count()).toBeLessThanOrEqual(8);

    await page.keyboard.press("Tab");
    await expect(panel.getByRole("link", { name: "Zürich" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Space");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("öffnet nicht allein auf Hover und schliesst bei Klick ausserhalb", async ({ page }) => {
    await confirmAge(page);
    const trigger = page.getByRole("button", { name: "Entdecken", exact: true });
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.mouse.click(640, 700);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("zeigt Besuchern den Hinweis auf das Konto und Mitgliedern ihre Ziele", async ({ page }) => {
    await confirmAge(page);
    await page.getByRole("button", { name: "Entdecken", exact: true }).click();
    await expect(page.getByText("Mit einem Konto speicherst du Suchen und Favoriten.")).toBeVisible();
    await signIn(page, "mitglied");
    await page.reload();
    await page.getByRole("button", { name: "Entdecken", exact: true }).click();
    await expect(page.getByRole("link", { name: "Gespeicherte Suchen" })).toBeVisible();
  });
});

test.describe("Sprachen (PRD 7)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const [locale, path, heading] of [
    ["fr", "/fr/pour-prestataires", "Un studio pour ton quotidien"],
    ["it", "/it/per-fornitori", "Uno studio per il tuo lavoro quotidiano"],
    ["en", "/en/for-providers", "A studio for your working day"],
  ] as const) {
    test(`${locale}: übersetzter Pfad und übersetzte Texte`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expectNoSeriousAxeFindings(page);
    });
  }

  test("der Sprachwechsel bleibt auf derselben Seite", async ({ page }) => {
    await page.goto("/de/fuer-anbieter");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/pour-prestataires$/);
  });

  test("unbekannte Seiten zeigen eine 404 mit nächstem Schritt in der Shell", async ({ page }) => {
    const response = await page.goto("/de/gibt-es-nicht");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diese Seite gibt es nicht");
    await expect(page.getByRole("link", { name: "Zu Entdecken wechseln" })).toBeVisible();
    await expect(page.locator("[data-app-header]")).toBeVisible();
  });
});

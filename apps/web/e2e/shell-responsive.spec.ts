import { expect, test } from "@playwright/test";
import { WIDTHS, expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge, signIn } from "./support/session";

const visitorPages = ["/de", "/de/fuer-anbieter", "/de/alterspruefung", "/de/gibt-es-nicht"];

test.describe("Breiten und Zoom (Abnahme der Oberfläche, Punkt 5)", () => {
  for (const width of WIDTHS) {
    test(`kein horizontales Scrollen bei ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await confirmAge(page);
      for (const path of visitorPages) {
        await page.goto(path);
        await expectNoHorizontalScroll(page);
      }
      await signIn(page, "anbieter");
      await page.goto("/de/studio");
      await expectNoHorizontalScroll(page);
    });
  }

  test("200 % Zoom bei 1280 px entspricht 640 px Breite: kein horizontales Scrollen", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await confirmAge(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe("Mobile Glas-Navigation (PRD 5.5, 6.4)", () => {
  test.use({ viewport: { width: 375, height: 760 } });

  test("Besucher: Tab-Leiste aus Glas mit den Tabs der PRD, höchstens drei Glasflächen", async ({ page }) => {
    await confirmAge(page);
    const tabBar = page.locator("[data-glass-tab-bar]");
    await expect(tabBar).toBeVisible();
    await expect(tabBar.getByRole("link")).toHaveText(["Entdecken", "Clubs", "Anmelden"]);
    await expect(page.locator("[data-app-header]")).toBeHidden();
    const visibleGlass = await page.locator(".glass").evaluateAll((nodes) => nodes.filter((node) => (node as HTMLElement).offsetParent !== null || getComputedStyle(node).position === "fixed").length);
    expect(visibleGlass).toBeLessThanOrEqual(3);
    await expectNoSeriousAxeFindings(page);
  });

  test("die Kapsel sitzt 12 px vom Rand und schrumpft beim Scrollen nach unten", async ({ page }) => {
    await confirmAge(page);
    const tabBar = page.locator("[data-glass-tab-bar]");
    const box = await tabBar.boundingBox();
    expect(Math.round(box?.x ?? 0)).toBe(12);
    await page.evaluate(() => {
      document.body.style.minHeight = "3000px";
    });
    await page.mouse.wheel(0, 900);
    await expect(tabBar).toHaveAttribute("data-compact", "true");
    await page.mouse.wheel(0, -300);
    await expect(tabBar).not.toHaveAttribute("data-compact", "true");
  });

  test("Anbieter: der Moduswechsel tauscht die Tabs, «Nachrichten» bleibt an dritter Stelle, «Mehr» öffnet ein Sheet", async ({ page }) => {
    await signIn(page, "anbieter");
    await page.goto("/de/fuer-anbieter");
    const tabBar = page.locator("[data-glass-tab-bar]");
    await expect(tabBar.getByRole("listitem")).toHaveText(["Entdecken", "Nachrichten", "Favoriten", "Ich"]);
    await page.getByRole("link", { name: "Studio", exact: true }).click();
    await expect(page).toHaveURL(/\/de\/studio$/);
    await expect(tabBar.getByRole("listitem")).toHaveText(["Heute", "Kalender", "Nachrichten", "Statistik", "Mehr"]);
    await tabBar.getByRole("button", { name: "Mehr" }).click();
    const sheet = page.getByRole("dialog", { name: "Mehr" });
    await expect(sheet.getByRole("link", { name: "Mein Profil" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Einstellungen" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Profil pausieren" })).toBeVisible();
  });

  test("das Entdecken-Sheet enthält die Ziele des Mega-Menüs", async ({ page }) => {
    await confirmAge(page);
    await page.locator("[data-navigation-trigger=sheet]").click();
    const sheet = page.getByRole("dialog", { name: "Navigation" });
    await expect(sheet.getByRole("link", { name: "Zürich" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Heute verfügbar" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Für Anbieter" })).toBeVisible();
  });

  test("mit «mehr Kontrast» ist die Navigationsebene deckend", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    await confirmAge(page);
    const filter = await page.locator("[data-glass-tab-bar]").evaluate((node) => getComputedStyle(node).backdropFilter);
    expect(filter).toBe("none");
  });
});

test.describe("Darstellung (PRD 5.1)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Dunkelmodus: wählbar, bleibt nach dem Neuladen und besteht axe", async ({ page }) => {
    await confirmAge(page);
    await page.getByRole("button", { name: "Dunkel" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(20, 17, 19)");
    await expectNoSeriousAxeFindings(page);
  });
});

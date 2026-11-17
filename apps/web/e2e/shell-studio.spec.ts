import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge, signIn } from "./support/session";

test.use({ viewport: { width: 1280, height: 800 } });

test.describe("Wechsel Marktplatz ↔ Studio (PRD 6.1, 8.1)", () => {
  test("lädt die Kopfzeile nicht neu und führt zur zuletzt besuchten Seite zurück", async ({ page }) => {
    await signIn(page, "anbieter");
    await page.goto("/de/fuer-anbieter");
    // Markiert den DOM-Knoten der Kopfzeile: Er muss den Wechsel überleben.
    await page.evaluate(() => {
      (window as unknown as { __header: Element | null }).__header = document.querySelector("[data-app-header]");
    });
    const sameHeader = () =>
      page.evaluate(() => {
        const marked = (window as unknown as { __header: Element | null }).__header;
        return marked !== null && marked.isConnected && marked === document.querySelector("[data-app-header]");
      });

    const header = page.locator("[data-app-header]");
    await header.locator("[data-mode=studio]").click();
    await expect(page).toHaveURL(/\/de\/studio$/);
    await expect(page.locator("[data-studio-sidebar]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Heute");
    expect(await sameHeader()).toBe(true);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    await header.locator("[data-mode=marketplace]").click();
    await expect(page).toHaveURL(/\/de\/fuer-anbieter$/);
    await expect(page.locator("[data-studio-sidebar]")).toHaveCount(0);
    expect(await sameHeader()).toBe(true);
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("Mitglieder ohne Anbieterrolle sehen keinen ModeSwitch; /studio führt zu «Für Anbieter»", async ({ page }) => {
    await signIn(page, "mitglied");
    await page.goto("/de");
    await expect(page.locator("[data-app-header] [data-mode]")).toHaveCount(0);
    await page.goto("/de/studio");
    await expect(page).toHaveURL(/\/de\/fuer-anbieter$/);
  });

  test("Besucher sehen «Anmelden» und «Als Anbieter starten»; /studio führt zur Anmeldung mit Rücksprungziel", async ({ page }) => {
    await confirmAge(page);
    const header = page.locator("[data-app-header]");
    await expect(header.getByRole("link", { name: "Anmelden" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Als Anbieter starten" })).toBeVisible();
    await page.goto("/de/studio");
    await expect(page).toHaveURL(/\/de\/anmelden\?weiter=%2Fde%2Fstudio$/);
  });

  test("eine begonnene Anbieterrolle führt ins Onboarding", async ({ page }) => {
    await signIn(page, "entwurf");
    await page.goto("/de/studio");
    // Das Onboarding führt weiter zum ersten offenen Schritt (Schritt 1.5).
    await expect(page).toHaveURL(/\/de\/studio\/start(\/[a-z-]+)?$/);
  });

  test("Organisationsmitglieder landen im Kontext ihrer Organisation, fremde Organisationen existieren für sie nicht", async ({ page }) => {
    await signIn(page, "club");
    await page.goto("/de/studio");
    await expect(page).toHaveURL(/\/de\/studio\/o\/testclub-fiktiv$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Heute bei Testclub Fiktiv");
    await expect(page.locator("[data-studio-sidebar]").getByRole("link", { name: "Standorte" })).toBeVisible();
    expect((await page.goto("/de/studio/o/anderer-club"))?.status()).toBe(404);

    await signIn(page, "anbieter");
    expect((await page.goto("/de/studio/o/testclub-fiktiv"))?.status()).toBe(404);
  });
});

test.describe("Profil pausieren (PRD 6.2, 13)", () => {
  test("wirkt mit einem Klick und lässt sich im Toast rückgängig machen", async ({ page }) => {
    await signIn(page, "anbieter");
    await page.goto("/de/studio");
    const status = page.locator("[data-studio-sidebar] [data-profile-status]");
    await expect(status).toHaveAttribute("data-profile-status", "PUBLISHED");
    await status.getByRole("button", { name: "Profil pausieren" }).click();
    await expect(status).toHaveAttribute("data-profile-status", "PAUSED");
    await expect(status).toContainText("Pausiert");
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(status).toHaveAttribute("data-profile-status", "PUBLISHED");
    await expect(status).toContainText("Online");
  });
});

test.describe("Befehlspalette (PRD 6.1)", () => {
  test("findet mit Ctrl+K Seiten beider Bereiche", async ({ page }) => {
    await signIn(page, "anbieter");
    await page.goto("/de/fuer-anbieter");
    const input = page.getByRole("combobox", { name: "Seite oder Bereich eingeben" });
    // Das Tastenkürzel wirkt erst, wenn die Seite hydriert ist.
    await expect(async () => {
      if (!(await input.isVisible())) await page.keyboard.press("Control+k");
      await expect(input).toBeFocused({ timeout: 1000 });
    }).toPass();
    await input.fill("Kalender");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/de\/studio\/kalender$/);
  });
});

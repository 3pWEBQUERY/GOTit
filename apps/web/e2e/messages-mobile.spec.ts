import { cleanup } from "./admin-fixtures";
import {
  createConversation,
  createMember,
  createProvider,
  signedInPage,
  threadLog,
} from "./messages-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Mobil (PRD v2 6.4, 11.4): Liste, dann Unterhaltung als Vollbild ohne
 * Tab-Leiste mit Composer aus Glas, Kontext als Sheet. Kein horizontales
 * Scrollen bei 375 px.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Messenger: mobil", () => {
  test("375 px: Liste mit Tab-Leiste, Unterhaltung ohne Tab-Leiste, Kontext als Sheet", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      {
        from: "provider",
        body: "Eine längere Nachricht, die auf einem schmalen Bildschirm umbrechen muss, ohne seitlich zu scrollen.",
        minutesAgo: 60 * 26,
      },
      { from: "member", body: "Kurze Antwort.", minutesAgo: 5 },
    ]);
    const page = await signedInPage(browser, member, baseURL, {
      viewport: { width: 375, height: 740 },
      hasTouch: true,
    });
    await page.goto("/de/nachrichten");
    await expect(page.locator("[data-glass-tab-bar]")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);

    await page
      .getByRole("navigation", { name: "Unterhaltungen" })
      .getByRole("link", { name: new RegExp(provider.displayName) })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/de/nachrichten/${conversationId}$`),
    );
    await expect(threadLog(page)).toContainText("Kurze Antwort.");
    await expect(threadLog(page)).toContainText("Gestern");
    await expect(threadLog(page)).toContainText("Heute");
    await expect(page.locator("[data-glass-tab-bar]")).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Unterhaltungen" }),
    ).toBeHidden();
    await expect(page.locator("form[data-glass]")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);

    await page
      .getByRole("button", { name: "Details zur Unterhaltung" })
      .click();
    const sheet = page.getByRole("dialog", { name: "Details" });
    await expect(
      sheet.getByRole("link", { name: "Profil ansehen" }),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await sheet.getByRole("button", { name: "Profil melden" }).click();
    await expect(
      page.getByRole("dialog", { name: "Kontakt melden" }),
    ).toBeVisible();
    await expect(sheet).toBeHidden();
    await page.keyboard.press("Escape");

    await page
      .getByRole("textbox", { name: `Nachricht an ${provider.displayName}` })
      .fill("Vom Telefon gesendet.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(
      threadLog(page)
        .getByRole("listitem")
        .filter({ hasText: "Vom Telefon gesendet." }),
    ).toContainText("Gesendet");

    // Zurück zur Liste: die Tab-Leiste kommt wieder.
    await page.goBack();
    await page.goto("/de/nachrichten");
    await expect(page.locator("[data-glass-tab-bar]")).toBeVisible();
  });

  test("Studio 375 px: Unterhaltung mit Labels und Notiz im Sheet, ohne horizontales Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      { from: "member", body: "Hallo aus dem Test.", minutesAgo: 5 },
    ]);
    const page = await signedInPage(browser, provider, baseURL, {
      viewport: { width: 375, height: 740 },
      hasTouch: true,
    });
    await page.goto(`/de/studio/nachrichten/${conversationId}`);
    await expect(threadLog(page)).toContainText("Hallo aus dem Test.");
    await expect(page.locator("[data-glass-tab-bar]")).toBeHidden();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
    await page
      .getByRole("button", { name: "Details zur Unterhaltung" })
      .click();
    const sheet = page.getByRole("dialog", { name: "Details" });
    await expect(
      sheet.getByRole("checkbox", { name: "Neue Anfrage" }),
    ).toBeVisible();
    await expect(
      sheet.getByRole("textbox", { name: "Private Notiz" }),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });

  test("Tastatur: Ansichten, Liste und Composer ohne Maus erreichbar", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      { from: "provider", body: "Mit der Tastatur antworten.", minutesAgo: 5 },
    ]);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    const field = page.getByRole("textbox", {
      name: `Nachricht an ${provider.displayName}`,
    });
    await field.focus();
    await page.keyboard.type("Zeile eins");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("Zeile zwei");
    await page.keyboard.press("Enter");
    await expect(
      threadLog(page).getByRole("listitem").filter({ hasText: "Zeile eins" }),
    ).toContainText("Zeile zwei");
    await expect(field).toHaveValue("");
    await threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Mit der Tastatur" })
      .getByRole("button", { name: "Aktionen zur Nachricht" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: "Nachricht melden" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
  });
});

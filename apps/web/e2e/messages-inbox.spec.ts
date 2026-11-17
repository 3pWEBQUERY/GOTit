import { cleanup, query } from "./admin-fixtures";
import {
  createConversation,
  createMember,
  createProvider,
  inboxRow,
  signedInPage,
  threadLog,
} from "./messages-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Postfach (v1 FR-CHAT-002, -003): Archivieren mit «Rückgängig», Favoriten,
 * Suche in eigenen Chats, im Studio Labels mit Filter und private Notiz, die
 * das Mitglied nie sieht (Entscheid 0014).
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Messenger: Postfach", () => {
  test("archivieren mit «Rückgängig», Favorit mit Stern, Ansichten in der URL", async ({
    browser,
    baseURL,
  }) => {
    const member = await createMember(created);
    const first = await createProvider(created);
    const second = await createProvider(created);
    const archivedId = await createConversation(member, first, [
      {
        from: "provider",
        body: "Erste Unterhaltung, bald im Archiv.",
        minutesAgo: 10,
      },
    ]);
    await createConversation(member, second, [
      { from: "provider", body: "Zweite Unterhaltung bleibt.", minutesAgo: 5 },
    ]);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${archivedId}`);
    await page
      .getByRole("button", { name: "Unterhaltung archivieren" })
      .click();
    await expect(
      page.getByText("Unterhaltung archiviert", { exact: true }),
    ).toBeVisible();
    await expect(inboxRow(page, first.displayName)).toHaveCount(0);
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(inboxRow(page, first.displayName)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Unterhaltung archivieren" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Unterhaltung archivieren" })
      .click();
    await expect(inboxRow(page, first.displayName)).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Ansichten des Postfachs" })
      .getByRole("link", { name: "Archiviert" })
      .click();
    await expect(page).toHaveURL(/ansicht=archiviert/);
    await expect(inboxRow(page, first.displayName)).toHaveCount(1);
    await expect(inboxRow(page, second.displayName)).toHaveCount(0);
    await page.getByRole("button", { name: "Aus dem Archiv holen" }).click();
    await expect(page.getByText("Archiv ist leer")).toBeVisible();

    await page.getByRole("button", { name: "Als Favorit markieren" }).click();
    await expect(
      page.getByRole("button", { name: "Als Favorit markieren" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("navigation", { name: "Ansichten des Postfachs" })
      .getByRole("link", { name: "Favoriten" })
      .click();
    await expect(page).toHaveURL(/ansicht=favoriten/);
    await expect(inboxRow(page, first.displayName)).toHaveCount(1);
    await expect(inboxRow(page, second.displayName)).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Ansichten des Postfachs" })
        .getByRole("link", { name: "Favoriten" }),
    ).toHaveAttribute("aria-current", "page");
    await expectNoSeriousAxeFindings(page);
  });

  test("Suche in eigenen Chats nach Name und Text; «Keine Treffer» mit Ausweg", async ({
    browser,
    baseURL,
  }) => {
    const member = await createMember(created);
    const first = await createProvider(created);
    const second = await createProvider(created);
    await createConversation(member, first, [
      {
        from: "provider",
        body: "Wir treffen uns beim Bahnhof Enge.",
        minutesAgo: 10,
      },
    ]);
    await createConversation(member, second, [
      { from: "member", body: "Danke für die Antwort.", minutesAgo: 5 },
    ]);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto("/de/nachrichten");
    await expect(inboxRow(page, second.displayName)).toContainText(
      "Du: Danke für die Antwort.",
    );
    const search = page.getByRole("searchbox", {
      name: "In Unterhaltungen suchen",
    });
    await search.fill("Bahnhof Enge");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=Bahnhof\+Enge/);
    await expect(inboxRow(page, first.displayName)).toHaveCount(1);
    await expect(inboxRow(page, second.displayName)).toHaveCount(0);
    await page
      .getByRole("searchbox", { name: "In Unterhaltungen suchen" })
      .fill(second.displayName);
    await page
      .getByRole("searchbox", { name: "In Unterhaltungen suchen" })
      .press("Enter");
    await expect(inboxRow(page, second.displayName)).toHaveCount(1);
    await expect(inboxRow(page, first.displayName)).toHaveCount(0);
    await page
      .getByRole("searchbox", { name: "In Unterhaltungen suchen" })
      .fill("gibt es nirgends");
    await page
      .getByRole("searchbox", { name: "In Unterhaltungen suchen" })
      .press("Enter");
    await expect(
      page.getByText("Keine Unterhaltung passt zu «gibt es nirgends»."),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Suche und Filter zurücksetzen" })
      .click();
    await expect(inboxRow(page, first.displayName)).toHaveCount(1);
    await expect(inboxRow(page, second.displayName)).toHaveCount(1);
  });

  test("Studio: Standard-Labels, zuordnen, filtern, verwalten; private Notiz; das Mitglied sieht nichts davon", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const anna = await createMember(created, `anna_${Date.now().toString(36)}`);
    const other = await createMember(created);
    const conversationId = await createConversation(anna, provider, [
      {
        from: "member",
        body: "Hallo, ich hätte gern einen Termin.",
        minutesAgo: 10,
      },
    ]);
    await createConversation(other, provider, [
      { from: "member", body: "Eine andere Anfrage.", minutesAgo: 5 },
    ]);
    const studio = await signedInPage(browser, provider, baseURL);
    // Als Anbieter gehört die Unterhaltung ins Studio; der Link in den Marktplatz führt dorthin.
    await studio.goto(`/de/nachrichten/${conversationId}`);
    await expect(studio).toHaveURL(
      new RegExp(`/de/studio/nachrichten/${conversationId}$`),
    );
    const context = studio.getByRole("complementary", {
      name: "Details zur Unterhaltung",
    });
    for (const label of [
      "Neue Anfrage",
      "Termin offen",
      "Bestätigt",
      "Rückmeldung nötig",
    ])
      await expect(
        context.getByRole("checkbox", { name: label }),
      ).toBeVisible();
    await context.getByRole("checkbox", { name: "Termin offen" }).click();
    await expect(context.getByText("Labels gespeichert")).toBeVisible();
    await expect(inboxRow(studio, "anna_")).toContainText("Termin offen");

    await context
      .getByRole("textbox", { name: "Private Notiz" })
      .fill("Bevorzugt Donnerstag, nur abends.");
    await context.getByRole("button", { name: "Notiz speichern" }).click();
    await expect(context.getByText("Notiz gespeichert")).toBeVisible();
    await expectNoSeriousAxeFindings(studio);

    await studio.getByRole("combobox", { name: "Label" }).click();
    await studio.getByRole("option", { name: "Termin offen" }).click();
    await expect(studio).toHaveURL(/label=/);
    await expect(inboxRow(studio, "anna_")).toHaveCount(1);
    await expect(
      studio
        .getByRole("navigation", { name: "Unterhaltungen" })
        .locator(":scope > ul > li"),
    ).toHaveCount(1);

    // Verwalten: umbenennen und löschen, Löschen fragt am Ort nach.
    await studio.getByRole("button", { name: "Labels verwalten" }).click();
    const panel = studio.getByRole("dialog", { name: "Labels" });
    await panel
      .getByRole("button", { name: "Termin offen umbenennen" })
      .click();
    await panel
      .getByRole("textbox", { name: "Name des Labels" })
      .fill("Termin vorschlagen");
    await panel.getByRole("button", { name: "Namen speichern" }).click();
    await expect(
      panel.getByRole("button", { name: "Termin vorschlagen umbenennen" }),
    ).toBeVisible();
    await panel
      .getByRole("textbox", { name: "Neues Label" })
      .fill("Stammkundschaft");
    await panel.getByRole("button", { name: "Label anlegen" }).click();
    await expect(
      panel.getByRole("button", { name: "Stammkundschaft löschen" }),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "Stammkundschaft löschen" })
      .click();
    await expect(panel).toContainText(
      "Das Label verschwindet aus allen Unterhaltungen.",
    );
    await panel.getByRole("button", { name: "Label löschen" }).click();
    await expect(
      panel.getByRole("button", { name: "Stammkundschaft löschen" }),
    ).toHaveCount(0);
    await panel.getByRole("button", { name: "Labels schliessen" }).click();
    await expect(inboxRow(studio, "anna_")).toContainText("Termin vorschlagen");

    const [stored] = await query<{ note: string | null }>(
      `select note from conversation_participant where "conversationId" = $1 and "userId" = $2`,
      [conversationId, provider.id],
    );
    expect(stored?.note).toBe("Bevorzugt Donnerstag, nur abends.");

    const page = await signedInPage(browser, anna, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    await expect(threadLog(page)).toContainText(
      "Hallo, ich hätte gern einen Termin.",
    );
    // Auch nicht im Quelltext der Seite: Notiz und Labels kommen gar nicht erst beim Mitglied an.
    const html = await page.content();
    expect(html).not.toContain("Bevorzugt Donnerstag");
    expect(html).not.toContain("Termin vorschlagen");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(
      page
        .getByRole("complementary", { name: "Details zur Unterhaltung" })
        .getByRole("link", { name: "Profil ansehen" }),
    ).toHaveAttribute("href", `/de/p/${provider.slug}`);
  });
});

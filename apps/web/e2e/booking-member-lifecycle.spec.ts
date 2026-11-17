import type { Page } from "@playwright/test";
import { cleanup, query } from "./admin-fixtures";
import {
  bookingCard,
  createBookableProvider,
  createRequest,
  dayLabel,
  requestStatus,
  zurichDay,
  zurichTime,
} from "./booking-fixtures";
import { createMember, signedInPage } from "./messages-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Lebenslauf einer Anfrage aus Sicht des Mitglieds (v1 FR-BOOKING-003/004/006,
 * Abnahme 20.5, v2 11.5): absagen mit Rückfrage, Gegenvorschlag des Anbieters
 * aus der Karte im Verlauf, annehmen, «Aus Sicherheitsgründen absagen» mit
 * Melden, Verlauf, fremde IDs, Zeitzone und schmale Bildschirme.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

async function setup() {
  const provider = await createBookableProvider(created);
  const member = await createMember(created);
  const day = zurichDay(2).day;
  const request = await createRequest(
    member,
    provider,
    zurichTime(day, "18:00"),
  );
  return { provider, member, day, ...request };
}

function detailHeading(page: Page, name: string) {
  return page.getByRole("heading", {
    level: 1,
    name: `Terminanfrage an ${name}`,
  });
}

test.describe("Terminanfrage: Lebenslauf", () => {
  test("Mitglied sagt mit Rückfrage und Grund ab; beide Seiten sehen «Abgesagt», der Verlauf nennt den Grund", async ({
    browser,
    baseURL,
  }) => {
    const { provider, member, requestId, conversationId } = await setup();
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/termine/${requestId}`);
    await expect(detailHeading(page, provider.displayName)).toBeVisible();
    await expect(
      page.getByText(
        "Jede Terminanfrage ist freiwillig. Absagen geht immer, ohne Begründung.",
      ),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.getByRole("button", { name: "Anfrage absagen" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Anfrage absagen?" });
    await expect(dialog).toContainText("Die Absage ist endgültig.");
    await expect(
      dialog.getByRole("button", { name: "Nicht absagen" }),
    ).toBeFocused();
    await dialog
      .getByRole("textbox", { name: /Grund/ })
      .fill("Fiktiver Grund aus dem Test");
    await dialog.getByRole("button", { name: "Anfrage absagen" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("header").getByText("Abgesagt")).toBeVisible();
    expect(await requestStatus(requestId)).toBe("CANCELLED");
    await expect(
      page.getByRole("button", { name: "Anfrage absagen" }),
    ).toHaveCount(0);
    const history = page.getByRole("list", {
      name: "Verlauf der Terminanfrage",
    });
    await expect(history.getByRole("listitem")).toHaveCount(2);
    await expect(history.getByRole("listitem").first()).toContainText(
      "Abgesagt",
    );
    await expect(history.getByRole("listitem").first()).toContainText("Du");
    await expect(history).toContainText("Grund: Fiktiver Grund aus dem Test");

    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    await expect(bookingCard(studio, requestId)).toContainText("Abgesagt");
    await expect(
      bookingCard(studio, requestId).getByRole("button"),
    ).toHaveCount(0);

    await page.goto("/de/termine?ansicht=vergangen");
    await expect(page.getByRole("link", { name: "Vergangen" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("[data-booking-list=vergangen]")).toContainText(
      "Abgesagt",
    );
  });

  test("Anbieter schlägt in der Karte eine andere Zeit vor, das Mitglied nimmt an; der Verlauf zeigt jeden Wechsel mit Rolle", async ({
    browser,
    baseURL,
  }) => {
    const { provider, member, requestId, conversationId } = await setup();
    const later = zurichDay(3).day;
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    const card = bookingCard(studio, requestId);
    await card.getByRole("button", { name: "Andere Zeit vorschlagen" }).click();
    const dialog = studio.getByRole("dialog", {
      name: "Andere Zeit vorschlagen",
    });
    const [y, m, d] = later.split("-");
    await dialog.getByRole("textbox", { name: "Tag" }).fill(`${d}.${m}.${y}`);
    await dialog.getByRole("textbox", { name: "Uhrzeit" }).fill("19:30");
    await dialog.getByRole("textbox", { name: "Uhrzeit" }).blur();
    await dialog.getByRole("button", { name: "Vorschlag senden" }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText("In Abstimmung");
    await expect(card).toContainText(`${dayLabel(later)}, 19:30–20:30`);
    await expect(
      card.getByRole("button", { name: "Vorschlag annehmen" }),
    ).toHaveCount(0);

    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/termine/${requestId}`);
    await expect(
      page.getByText(`Neuer Vorschlag von ${provider.displayName}`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Vorschlag annehmen" }).click();
    await expect(page.locator("header").getByText("Bestätigt")).toBeVisible();
    expect(await requestStatus(requestId)).toBe("CONFIRMED");
    const items = page
      .getByRole("list", { name: "Verlauf der Terminanfrage" })
      .getByRole("listitem");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("Bestätigt");
    await expect(items.nth(0)).toContainText("Du");
    await expect(items.nth(1)).toContainText("Neuer Vorschlag");
    await expect(items.nth(1)).toContainText(provider.displayName);
    await expect(items.nth(1)).toContainText(`${dayLabel(later)}, 19:30–20:30`);
    await expect(items.nth(2)).toContainText("Angefragt");
    await expect(
      page.getByRole("button", { name: "Termin absagen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Unterhaltung öffnen" }),
    ).toHaveAttribute("href", `/de/nachrichten/${conversationId}`);

    // Ohne Neuladen: Die Karte im Studio zeigt «Bestätigt» über die Echtzeit.
    await expect(card).toContainText("Bestätigt", { timeout: 15_000 });
    await page.goto("/de/ich");
    await expect(page.locator("#naechste-termine")).toContainText(
      provider.displayName,
    );
    await expect(page.locator("#offene-anfragen")).not.toContainText(
      provider.displayName,
    );
  });

  test("Aus Sicherheitsgründen absagen bietet danach das Melden an; die Gegenseite sieht nur «Abgesagt»", async ({
    browser,
    baseURL,
  }) => {
    const { provider, member, requestId, conversationId } = await setup();
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    const card = bookingCard(page, requestId);
    await card
      .getByRole("button", { name: "Aus Sicherheitsgründen absagen" })
      .click();
    const confirm = page.getByRole("alertdialog", {
      name: "Aus Sicherheitsgründen absagen?",
    });
    await expect(confirm).toContainText("sieht nur «Abgesagt»");
    await confirm.getByRole("button", { name: "Jetzt absagen" }).click();
    const report = page.getByRole("dialog", { name: "Kontakt melden" });
    await expect(report).toBeVisible();
    await expect(report).toContainText("Die Anfrage ist abgesagt.");
    await report
      .getByRole("radio", { name: "Belästigung oder Beleidigung" })
      .click();
    await report.getByRole("button", { name: "Beschreibung ergänzen" }).click();
    await report.getByRole("button", { name: "Meldung senden" }).click();
    await expect(report.getByText("Meldung gesendet")).toBeVisible();
    expect(await requestStatus(requestId)).toBe("CANCELLED");
    const [reported] = await query<{ count: string }>(
      `select count(*)::text as count from report where "reporterId" = $1`,
      [member.id],
    );
    expect(Number(reported?.count)).toBe(1);

    await page.goto(`/de/termine/${requestId}`);
    await expect(
      page.getByRole("list", { name: "Verlauf der Terminanfrage" }),
    ).toContainText("Aus Sicherheitsgründen abgesagt");
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    await expect(bookingCard(studio, requestId)).toContainText("Abgesagt");
    // Sichtbarer Text, nicht das Dokument: Die Übersetzungen des Clients enthalten das Wort als Beschriftung.
    expect(await studio.locator("body").innerText()).not.toContain(
      "Sicherheitsgründen abgesagt",
    );
  });

  test("fremde oder unbekannte Anfrage: 404; der Anbieter landet im Studio", async ({
    browser,
    baseURL,
  }) => {
    const { provider, requestId } = await setup();
    const other = await createMember(created);
    const page = await signedInPage(browser, other, baseURL);
    expect((await page.goto(`/de/termine/${requestId}`))?.status()).toBe(404);
    expect((await page.goto("/de/termine/gibt-es-nicht"))?.status()).toBe(404);
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/termine/${requestId}`);
    await expect(studio).toHaveURL(
      new RegExp(`/de/studio/anfragen/${requestId}$`),
    );
  });

  test("Zeitzone: weicht der Browser ab, steht die Zone des Anbieters dabei; 375 px ohne seitliches Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const { member, requestId, day } = await setup();
    const zurich = await signedInPage(browser, member, baseURL);
    await zurich.goto(`/de/termine/${requestId}`);
    await expect(
      zurich.getByText(`${dayLabel(day)}, 18:00–19:00`).first(),
    ).toBeVisible();
    await expect(zurich.getByText("Mitteleuropäische Zeit")).toHaveCount(0);

    const newYork = await signedInPage(browser, member, baseURL, {
      timezoneId: "America/New_York",
      viewport: { width: 375, height: 800 },
    });
    await newYork.goto(`/de/termine/${requestId}`);
    await expect(
      newYork
        .getByText(`${dayLabel(day)}, 18:00–19:00 (Mitteleuropäische Zeit)`)
        .first(),
    ).toBeVisible();
    await expectNoHorizontalScroll(newYork);
    await expectNoSeriousAxeFindings(newYork);
    await newYork.goto("/de/termine");
    await expect(newYork.locator("[data-booking-list=offen]")).toContainText(
      "(Mitteleuropäische Zeit)",
    );
    await expectNoHorizontalScroll(newYork);
    await expectNoSeriousAxeFindings(newYork);
  });
});

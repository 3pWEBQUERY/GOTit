import type { Browser, Page } from "@playwright/test";
import { cleanup } from "./admin-fixtures";
import { createProvider, signedInPage } from "./messages-fixtures";
import {
  insertEvents,
  plain,
  publishedMedia,
  shortDay,
} from "./stats-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Statistik `/studio/statistik` (PRD v2 11.6, Entscheid 0019). Ein fiktives
 * Profil mit Rohereignissen bekannter Zahl: in den letzten 7 Tagen und in den
 * 7 Tagen davor.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

async function providerWithData(
  browser: Browser,
  baseURL: string | undefined,
  viewport?: { width: number; height: number },
) {
  const provider = await createProvider(created);
  const mediaId = await publishedMedia(
    provider.profileId,
    provider.id,
    "Fiktives Foto am Fenster",
  );
  await insertEvents(provider.profileId, [
    // Diese 7 Tage.
    {
      kind: "SEARCH_IMPRESSION",
      day: -2,
      count: 30,
      searchKey: "ort=stadt-zuerich",
    },
    { kind: "SEARCH_IMPRESSION", day: -2, count: 10, searchKey: "-" },
    { kind: "PROFILE_VIEW", day: -1, count: 6 },
    { kind: "PROFILE_VIEW", day: -3, count: 4 },
    { kind: "CONTACT_ACTION", day: -1, count: 5 },
    { kind: "BOOKING_REQUEST", day: -1, count: 2 },
    { kind: "BOOKING_CONFIRMED", day: 0, count: 1 },
    { kind: "FAVORITE_ADDED", day: -4, count: 3 },
    { kind: "FAVORITE_REMOVED", day: -2, count: 1 },
    { kind: "MEDIA_VIEW", day: -1, count: 3, mediaId },
    // Die 7 Tage davor.
    { kind: "PROFILE_VIEW", day: -8, count: 8 },
    { kind: "CONTACT_ACTION", day: -9, count: 5 },
    { kind: "BOOKING_REQUEST", day: -10, count: 4 },
  ]);
  const page = await signedInPage(
    browser,
    provider,
    baseURL,
    viewport ? { viewport } : {},
  );
  return { provider, page };
}

const kpi = (page: Page, key: string) => page.locator(`[data-kpi="${key}"]`);
/** Der Wert einer Kennzahl ohne Bezeichnung und Vergleich. */
const kpiValue = (page: Page, key: string) =>
  kpi(page, key).locator("p").nth(1);
const chart = (page: Page, key: string) =>
  page.locator(`[data-stats-chart="${key}"]`);
const table = (page: Page, key: string) =>
  page.locator(`[data-stats-table="${key}"]`);

async function rowTexts(scope: ReturnType<Page["locator"]>): Promise<string[]> {
  return (await scope.locator("tbody tr").allInnerTexts()).map((text) =>
    plain(text).replace(/\s+/g, " ").trim(),
  );
}

test.describe("Statistik", () => {
  test("Kennzahlen mit Vergleich in Zahl und Wort, Trichter mit Quoten, Linie und Tabellen", async ({
    browser,
    baseURL,
  }) => {
    const { page } = await providerWithData(browser, baseURL);
    await page.goto("/de/studio/statistik");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Statistik",
    );

    await expect(kpiValue(page, "profileViews")).toHaveText("10");
    await expect(kpi(page, "profileViews")).toContainText(
      /25\s?%\smehr als in den 7 Tagen davor/,
    );
    await expect(kpi(page, "contactActions")).toContainText(
      "Gleich viele wie in den 7 Tagen davor",
    );
    await expect(kpi(page, "bookingRequests")).toContainText(
      /50\s?%\sweniger als in den 7 Tagen davor/,
    );
    await expect(kpi(page, "favoritesNet")).toContainText("+2");
    await expect(kpi(page, "favoritesNet")).toContainText(
      "2 mehr als in den 7 Tagen davor",
    );

    // Trichter: Tabellenansicht derselben Daten, Quote zur Stufe davor.
    const funnel = chart(page, "funnel");
    await funnel.getByRole("button", { name: "Als Tabelle anzeigen" }).click();
    await expect(funnel.locator("section")).toHaveAttribute(
      "data-view",
      "table",
    );
    expect(await rowTexts(funnel)).toEqual([
      "Einblendungen in der Suche 40",
      "Profilaufrufe 10 25%",
      "Kontaktaktionen 5 50%",
      "Terminanfragen 2 40%",
      "Bestätigte Termine 1 50%",
    ]);
    await expect(funnel).toContainText(
      "Die Quote ist der Anteil an der Stufe darüber",
    );

    const views = chart(page, "views");
    await views.getByRole("button", { name: "Als Tabelle anzeigen" }).click();
    const viewRows = await rowTexts(views);
    expect(viewRows).toHaveLength(7);
    expect(viewRows).toContain(`${shortDay(-1)} 6`);
    expect(viewRows).toContain(`${shortDay(-3)} 4`);
    expect(viewRows).toContain(`${shortDay(0)} 0`);
    await views.getByRole("button", { name: "Als Grafik anzeigen" }).click();
    await expect(views.locator("[data-chart-canvas]")).toHaveCount(1);

    expect(await rowTexts(table(page, "searches"))).toEqual([
      "Zürich 30",
      "Ohne Filter 10",
    ]);
    expect(await rowTexts(table(page, "media"))).toEqual([
      "Fiktives Foto am Fenster 3",
    ]);
    await expect(page.getByText("nie der eingegebene Text")).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });

  test("ein Zeitraum ohne Daten zeigt den Leerzustand; der Zeitraum steht in der URL", async ({
    browser,
    baseURL,
  }) => {
    const { page } = await providerWithData(browser, baseURL);
    await page.goto("/de/studio/statistik?von=2025-01-01&bis=2025-01-31");
    await expect(page.locator("[data-stats-period]")).toContainText(
      "31.01.2025, verglichen mit",
    );
    await expect(kpiValue(page, "profileViews")).toHaveText("0");
    for (const scope of [
      chart(page, "funnel"),
      chart(page, "views"),
      table(page, "searches"),
      table(page, "media"),
    ])
      await expect(scope).toContainText("Noch keine Daten für diesen Zeitraum");
    await expect(
      chart(page, "funnel").getByRole("button", {
        name: "Als Tabelle anzeigen",
      }),
    ).toHaveCount(0);

    await page.getByRole("radio", { name: "30 Tage" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/statistik\?zeitraum=30$/);
    // 30 Tage schliessen die 8 Aufrufe von vor 8 Tagen ein; davor gab es keine.
    await expect(kpiValue(page, "profileViews")).toHaveText("18");
    await expect(kpi(page, "profileViews")).toContainText(
      "18 mehr als in den 30 Tagen davor",
    );

    await page.getByRole("radio", { name: "Eigener Zeitraum" }).click();
    await expect(page).toHaveURL(
      /von=\d{4}-\d{2}-\d{2}&bis=\d{4}-\d{2}-\d{2}$/,
    );
    await expect(page.getByLabel("Von", { exact: true })).toBeVisible();

    await page.goto("/de/studio/statistik?von=2024-01-01&bis=2025-06-30");
    await expect(
      page.getByRole("status").filter({ hasText: "höchstens 366 Tage" }),
    ).toBeVisible();
    await expect(kpiValue(page, "profileViews")).toHaveText("10");
    await expectNoSeriousAxeFindings(page);
  });

  test("bei 375 px ohne horizontales Scrollen, die Tabellen als Karten", async ({
    browser,
    baseURL,
  }) => {
    const { page } = await providerWithData(browser, baseURL, {
      width: 375,
      height: 812,
    });
    await page.goto("/de/studio/statistik");
    await expect(kpiValue(page, "profileViews")).toHaveText("10");
    await expectNoHorizontalScroll(page);
    await expect(table(page, "searches")).toContainText("Zürich");
    await expectNoSeriousAxeFindings(page);
  });
});

import type { Page } from "@playwright/test";
import { cleanup, query } from "./admin-fixtures";
import {
  hitNames,
  indexedProviders,
  keyword,
  visitor,
} from "./search-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { indexProfiles } from "./support/search-index";
import { expect, test } from "./support/test";

/**
 * Suche `/suche` (PRD v2 9.2, Entscheid 0013). Jeder Test sucht nach seinem
 * eigenen Kennwort und sieht so nur seine fiktiven Profile.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Filter" });

test.describe("Suche: Filter, Chips, Sortierung, Ansicht", () => {
  test("Filter wirken sofort, behalten den Fokus und erscheinen als Chips; zurücksetzen stellt den Ausgangszustand her", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [
      { languages: ["de"], price: 200 },
      { languages: ["en"], price: 400 },
      { languages: ["de", "en"], price: null, region: "stadt-bern" },
      { languages: ["fr"], price: 150, publishedDaysAgo: 5 },
    ]);
    const page = await visitor(browser, `/de/suche?q=${word}`);
    await expect(heading(page)).toHaveText("4 Profile");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expectNoSeriousAxeFindings(page);

    const german = panel(page).getByRole("checkbox", { name: "Deutsch" });
    await german.click();
    await expect(page).toHaveURL(/sprache=de/);
    await expect(heading(page)).toHaveText("2 Profile");
    await expect(
      page.getByRole("status").filter({ hasText: "2 Profile" }),
    ).toHaveCount(1);
    await expect(german).toBeFocused();
    await expect(german).toBeChecked();

    await panel(page).getByRole("combobox", { name: "Region" }).click();
    await page.getByRole("option", { name: "Zürich", exact: true }).click();
    await expect(heading(page)).toHaveText("1 Profil in Zürich");
    await expect(page).toHaveURL(/ort=stadt-zuerich/);
    await expect(
      panel(page).getByRole("radiogroup", { name: "Umkreis" }),
    ).toBeVisible();

    const chips = page.getByRole("group", { name: "Aktive Filter" });
    await expect(chips).toContainText(`«${word}»`);
    await expect(chips).toContainText("Zürich");
    await chips
      .getByRole("button", { name: "Filter «Deutsch» entfernen" })
      .click();
    await expect(heading(page)).toHaveText("3 Profile in Zürich");
    await expect(german).not.toBeChecked();

    const max = panel(page).getByRole("textbox", { name: "Preis bis (CHF)" });
    await max.fill("250");
    await max.press("Enter");
    await expect(heading(page)).toHaveText("2 Profile in Zürich");
    await expect(chips).toContainText("bis CHF 250");
    await panel(page).getByRole("checkbox", { name: /^Neu/ }).click();
    await expect(heading(page)).toHaveText("1 Profil in Zürich");
    expect(await hitNames(page)).toEqual([
      expect.stringContaining(`${word} 03`),
    ]);

    await chips.getByRole("button", { name: "Alle zurücksetzen" }).click();
    await expect(page).toHaveURL(/\/de\/suche$/);
    await expect(
      panel(page).getByRole("checkbox", { name: /^Neu/ }),
    ).not.toBeChecked();
  });

  test("Sortierung nach Preis (ohne Preis zuletzt) und Listenansicht mit Sprachen und Preis", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [
      { price: 300 },
      { price: null },
      { price: 150 },
      { price: 220 },
    ]);
    const page = await visitor(browser, `/de/suche?q=${word}`);
    await expect(heading(page)).toHaveText("4 Profile");
    await page.getByRole("button", { name: /Sortierung/ }).click();
    await page.getByRole("menuitemradio", { name: "Preis" }).click();
    await expect(page).toHaveURL(/sortierung=preis/);
    await expect
      .poll(() => hitNames(page))
      .toEqual([
        expect.stringContaining(`${word} 02`),
        expect.stringContaining(`${word} 03`),
        expect.stringContaining(`${word} 00`),
        expect.stringContaining(`${word} 01`),
      ]);

    await page.getByRole("radio", { name: "Liste" }).click();
    await expect(page).toHaveURL(/ansicht=liste/);
    await expect(page.locator("[data-search-results=list]")).toBeVisible();
    await expect(
      page.locator("[data-search-results=list] > li").first(),
    ).toContainText("ab CHF 150");
    await expect(
      page.locator("[data-search-results=list] > li").first(),
    ).toContainText("Spricht Deutsch");
    await expect(
      page.locator("[data-search-results=list] > li").last(),
    ).toContainText("Preise auf Anfrage");
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Suche: Weitere laden", () => {
  test("«Weitere laden»: Filterzustand und geladene Ergebnisse überleben Neuladen und Zurück", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const word = keyword();
    await indexedProviders(
      created,
      word,
      Array.from({ length: 26 }, () => ({ languages: ["de"] })),
    );
    const page = await visitor(browser, `/de/suche?q=${word}&sprache=de`);
    await expect(heading(page)).toHaveText("26 Profile");
    await expect(
      page.locator("#inhalt [data-search-results] > li"),
    ).toHaveCount(24);
    await expect(page.getByText("1–24 von 26")).toBeVisible();

    await page.getByRole("link", { name: "Weitere 2 laden" }).click();
    await expect(page).toHaveURL(/seite=2/);
    await expect(
      page.locator("#inhalt [data-search-results] > li"),
    ).toHaveCount(26);
    await expect(page.getByText("1–26 von 26")).toBeVisible();
    await expect(page.getByRole("link", { name: /Weitere/ })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toBeAttached();

    await page.reload();
    await expect(
      page.locator("#inhalt [data-search-results] > li"),
    ).toHaveCount(26);
    await expect(
      panel(page).getByRole("checkbox", { name: "Deutsch" }),
    ).toBeChecked();

    const last = page.locator("#inhalt [data-search-results] > li").last();
    await last.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(300);
    await last.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/de\/p\/fiktiv-suche-/);
    await page.goBack();
    await expect(page).toHaveURL(/seite=2/);
    await expect(
      page.locator("#inhalt [data-search-results] > li"),
    ).toHaveCount(26);
    await expect(
      panel(page).getByRole("checkbox", { name: "Deutsch" }),
    ).toBeChecked();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(before - 200);
  });
});

test.describe("Suche: Leerzustand, Sichtbarkeit, Vorschläge", () => {
  test("keine Treffer: nennt den Filter, der am stärksten einschränkt, und entfernt genau ihn", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [{ price: 300 }, { price: 320 }]);
    const page = await visitor(
      browser,
      `/de/suche?q=${word}&preis_max=99&fotos=1`,
    );
    await expect(heading(page)).toHaveText("Keine Profile");
    await expect(page.getByText("Keine Profile gefunden")).toBeVisible();
    await expect(
      page.getByText(
        /Am stärksten schränkt «bis CHF 99» ein\. Ohne diesen Filter gibt es/,
      ),
    ).toHaveCount(0);
    // Ohne Preisgrenze bleiben die Fotos: noch immer null. Ohne Fotos bleibt die Preisgrenze: auch null. Also: zurücksetzen.
    await expect(
      page.getByRole("link", { name: "Alle Filter zurücksetzen" }),
    ).toBeVisible();

    await page.goto(`/de/suche?q=${word}&preis_max=99`);
    await expect(
      page.getByText(
        "Am stärksten schränkt «bis CHF 99» ein. Ohne diesen Filter gibt es 2 Profile.",
      ),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Filter «bis CHF 99» entfernen" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/de/suche\\?q=${word}$`));
    await expect(heading(page)).toHaveText("2 Profile");
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Suche: Sichtbarkeit und Vorschläge", () => {
  test("pausierte, gesperrte und eingeschränkte Profile erscheinen in keinem Suchpfad", async ({
    browser,
  }) => {
    const word = keyword();
    const [visible, paused, suspended, restricted] = await indexedProviders(
      created,
      word,
      [
        { region: "stadt-bern" },
        { region: "stadt-bern" },
        { region: "stadt-bern" },
        { region: "stadt-bern" },
      ],
    );
    // Ohne neuen Index-Job: Die Suche prüft den Status bei jeder Abfrage selbst (Entscheid 0013).
    await query(`update provider_profile set status = 'PAUSED' where id = $1`, [
      paused?.profileId,
    ]);
    await query(
      `update provider_profile set status = 'SUSPENDED' where id = $1`,
      [suspended?.profileId],
    );
    await query(
      `update provider_profile set status = 'RESTRICTED' where id = $1`,
      [restricted?.profileId],
    );
    const hidden = [paused, suspended, restricted].map(
      (provider) => provider?.name ?? "",
    );

    const page = await visitor(browser, `/de/suche?q=${word}`);
    const paths = [
      `/de/suche?q=${word}`,
      `/de/ch/bern?q=${word}`,
      `/de/ch/bern/stadt-bern?q=${word}`,
      `/de/profile?q=${word}`,
    ];
    for (const path of paths) {
      await page.goto(path);
      await expect(
        page.locator("#inhalt [data-search-results] > li"),
        path,
      ).toHaveCount(1);
      await expect(page.locator("#inhalt")).toContainText(visible?.name ?? "");
      for (const name of hidden)
        await expect(page.locator("#inhalt"), path).not.toContainText(name);
    }
    const suggestions = (await (
      await page.request.get(`/api/suche/vorschlaege?q=${word}&locale=de`)
    ).json()) as { suggestions: { name: string }[] };
    expect(suggestions.suggestions.map((entry) => entry.name)).toEqual([
      visible?.name,
    ]);
    expect(
      (
        (await (
          await page.request.get(`/api/suche/anzahl?q=${word}`)
        ).json()) as { total: number }
      ).total,
    ).toBe(1);

    await page
      .context()
      .addCookies([
        { name: "region", value: "stadt-bern", domain: "localhost", path: "/" },
      ]);
    await page.goto("/de");
    await expect(heading(page)).toHaveText("Profile in Bern");
    for (const name of hidden)
      await expect(page.locator("#inhalt")).not.toContainText(name);

    // Der Worker entfernt die Zeilen, sobald ein Job kommt.
    await indexProfiles(
      [
        paused?.profileId ?? "",
        suspended?.profileId ?? "",
        restricted?.profileId ?? "",
      ],
      false,
    );
  });

  test("Vorschläge: Region setzt den Ort, ein Profil öffnet die Profilseite, Enter sucht nach dem Text", async ({
    browser,
  }) => {
    const word = keyword();
    const [provider] = await indexedProviders(created, word, [{}]);
    const page = await visitor(browser, "/de/suche");
    const box = page.getByRole("combobox", { name: "Ort oder Name" });
    await box.fill("Lausan");
    await page.getByRole("option", { name: "Lausanne · Region" }).click();
    await expect(page).toHaveURL(/ort=lausanne/);

    await box.fill(word.toLowerCase());
    await expect(
      page.getByRole("option", { name: `${provider?.name} · Profil` }),
    ).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(new RegExp(`q=${word.toLowerCase()}`));
    await expect(page).toHaveURL(/ort=lausanne/);
    await expect(box).toHaveValue(word.toLowerCase());

    await box.fill(word.slice(0, 12));
    await page
      .getByRole("option", { name: `${provider?.name} · Profil` })
      .click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${provider?.slug}$`));
  });
});

test.describe("Suche auf Mobile (375 px)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("Filter-Sheet nennt die Trefferzahl live und wendet erst beim Bestätigen an; kein horizontales Scrollen", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [
      { languages: ["de"] },
      { languages: ["de"] },
      { languages: ["en"] },
    ]);
    const page = await visitor(browser, `/de/suche?q=${word}`, {
      width: 375,
      height: 800,
    });
    await expect(heading(page)).toHaveText("3 Profile");
    await expect(panel(page)).toBeHidden();
    await expectNoHorizontalScroll(page);

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Filter" });
    await sheet.getByRole("button", { name: "Profil", exact: true }).click();
    await sheet.getByRole("checkbox", { name: "Englisch" }).click();
    await expect(
      sheet.getByRole("button", { name: "1 Profil anzeigen" }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sprache/);
    await sheet.getByRole("checkbox", { name: "Deutsch" }).click();
    await expect(
      sheet.getByRole("button", { name: "3 Profile anzeigen" }),
    ).toBeVisible();
    await sheet.getByRole("checkbox", { name: "Deutsch" }).click();
    await expectNoSeriousAxeFindings(page);
    await sheet.getByRole("button", { name: "1 Profil anzeigen" }).click();

    await expect(page).toHaveURL(/sprache=en/);
    await expect(heading(page)).toHaveText("1 Profil");
    await expect(
      page.getByRole("button", { name: /^Filter 1 aktiv/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filter «Englisch» entfernen" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});

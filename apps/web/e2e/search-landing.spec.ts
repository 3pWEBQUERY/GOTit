import type { Page } from "@playwright/test";
import { cleanup, createAccount, query, signInAs } from "./admin-fixtures";
import {
  indexedProviders,
  keyword,
  removeCategory,
  testCategory,
  visitor,
} from "./search-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/** Landingpages, Entdecken und «Suche speichern» (PRD v2 7.1, 9.1, Entscheid 0013). */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const crumbs = (page: Page) =>
  page.getByRole("navigation", { name: "Brotkrumen" });

test.describe("Landingpages", () => {
  test("/ch listet Kantone und Städte; Kanton und Stadt mit Überschrift, Breadcrumbs und Canonical", async ({
    browser,
  }) => {
    const page = await visitor(browser, "/de/ch");
    await expect(heading(page)).toHaveText("Regionen der Schweiz");
    await expect(
      page.getByRole("link", { name: "Kanton Zürich" }),
    ).toHaveAttribute("href", "/de/ch/zuerich");
    await expect(
      page
        .locator("#inhalt")
        .getByRole("link", { name: "Zürich", exact: true }),
    ).toHaveAttribute("href", "/de/ch/zuerich/stadt-zuerich");
    await expect(page.locator("#inhalt img")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    await page.goto("/de/ch/zuerich");
    await expect(heading(page)).toHaveText("Profile im Kanton Zürich");
    await expect(crumbs(page)).toHaveText(/Entdecken.*Kanton Zürich/);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      /\/de\/ch\/zuerich$/,
    );
    await expect(
      page.locator('link[rel=alternate][hreflang="fr"]'),
    ).toHaveAttribute("href", /\/fr\/ch\/zuerich$/);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Städte im Kanton Zürich" }),
    ).toBeVisible();

    await page.goto("/de/ch/zuerich/stadt-zuerich");
    await expect(heading(page)).toHaveText("Profile in Zürich");
    await expect(crumbs(page)).toHaveText(/Entdecken.*Kanton Zürich.*Zürich/);
    await expectNoSeriousAxeFindings(page);
  });

  test("zusätzliche Filter bleiben auf der Landingpage, eine andere Region führt zu /suche", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [
      { languages: ["de"] },
      { languages: ["en"] },
      { languages: ["de"], region: "stadt-bern" },
    ]);
    const page = await visitor(
      browser,
      `/de/ch/zuerich/stadt-zuerich?q=${word}`,
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Profile in Zürich" }),
    ).toHaveText("2 Profile in Zürich");
    const panel = page.getByRole("complementary", { name: "Filter" });
    await panel.getByRole("checkbox", { name: "Deutsch" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/de/ch/zuerich/stadt-zuerich\\?q=${word}&sprache=de$`),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "in Zürich" }),
    ).toHaveText("1 Profil in Zürich");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    await panel.getByRole("combobox", { name: "Region" }).click();
    await page.getByRole("option", { name: "Bern", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/de/suche\\?q=${word}&ort=stadt-bern&sprache=de$`),
    );
    await expect(heading(page)).toHaveText("1 Profil in Bern");
    await page.goBack();
    await expect(page).toHaveURL(/\/de\/ch\/zuerich\/stadt-zuerich/);
  });

  test("Kategorie und /profile: eigene Überschrift, Profile mit Voreinstellung", async ({
    browser,
  }) => {
    const category = await testCategory();
    try {
      const word = keyword();
      await indexedProviders(created, word, [{ categoryId: category.id }, {}]);
      const page = await visitor(
        browser,
        `/de/kategorie/${category.slug}?q=${word}`,
      );
      await expect(heading(page)).toHaveText(`${category.name} in der Schweiz`);
      await expect(
        page.getByRole("status").filter({ hasText: "Profil" }),
      ).toHaveText("1 Profil");
      await expect(crumbs(page)).toHaveText(
        new RegExp(`Entdecken.*${category.name}`),
      );

      await page.goto(`/de/profile?q=${word}`);
      await expect(heading(page)).toHaveText("Profile in der Schweiz");
      await expect(
        page.locator("#inhalt [data-search-results] > li"),
      ).toHaveCount(2);
      await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
        "href",
        /\/de\/profile$/,
      );
    } finally {
      await removeCategory(category.id);
    }
  });

  test("unbekannte, nicht freigegebene oder falsch zugeordnete Regionen und Kategorien: 404", async ({
    browser,
  }) => {
    const page = await visitor(browser, "/de");
    for (const path of [
      "/de/ch/gibt-es-nicht",
      "/de/ch/aargau",
      "/de/ch/stadt-zuerich",
      "/de/ch/bern/stadt-zuerich",
      "/de/ch/zuerich/gibt-es-nicht",
      "/de/kategorie/gibt-es-nicht",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});

test.describe("Entdecken", () => {
  test("Region ändern, Reihen der Region, leere Region mit anderen Regionen; die Wahl bleibt nach dem Neuladen", async ({
    browser,
  }) => {
    const word = keyword();
    const [provider] = await indexedProviders(created, word, [
      { region: "lausanne", publishedDaysAgo: 3 },
    ]);
    const page = await visitor(browser, "/de");
    await expect(heading(page)).toHaveText(/^Profile in /);
    await page.getByRole("button", { name: "Region ändern" }).click();
    await page.getByRole("menuitem", { name: "Lausanne" }).click();
    await expect(heading(page)).toHaveText("Profile in Lausanne");
    const inRegion = page.getByRole("region", { name: "In Lausanne" });
    await expect(inRegion).toContainText(provider?.name ?? "");
    await expect(page.getByRole("region", { name: "Neu dabei" })).toContainText(
      provider?.name ?? "",
    );
    await expect(
      page
        .getByRole("navigation", { name: "Schnellfilter" })
        .getByRole("link", { name: "Fotos geprüft" }),
    ).toHaveAttribute("href", "/de/suche?ort=lausanne&fotos=1");
    await expect(
      page.getByRole("navigation", { name: "Regionen" }),
    ).toContainText("Alle Regionen");
    await expectNoSeriousAxeFindings(page);
    await page.reload();
    await expect(heading(page)).toHaveText("Profile in Lausanne");

    await page.getByRole("button", { name: "Region ändern" }).click();
    await page.getByRole("menuitem", { name: "Genf" }).click();
    await expect(heading(page)).toHaveText("Profile in Genf");
    await expect(
      page.getByText("In Genf gibt es noch keine Profile"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Andere Regionen" })
        .getByRole("link", { name: "Lausanne" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Neu dabei" })).toHaveCount(
      0,
    );
  });

  test("«In meiner Nähe» fragt den Standort erst nach dem Tippen ab und wählt die nächste Region", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      geolocation: { latitude: 46.95, longitude: 7.45 },
      permissions: [],
      extraHTTPHeaders: { "x-real-ip": "10.250.1.1" },
    });
    const page = await context.newPage();
    await page.goto("/de");
    await page.getByRole("button", { name: "Alter bestätigen" }).click();
    await page.waitForURL(/\/de$/);
    await context.grantPermissions(["geolocation"]);
    await page.getByRole("button", { name: "Region ändern" }).click();
    await page.getByRole("menuitem", { name: "In meiner Nähe" }).click();
    await expect(heading(page)).toHaveText("Profile in Bern");
    const cookie = (await context.cookies()).find(
      (entry) => entry.name === "region",
    );
    expect(cookie?.value).toBe("stadt-bern");
    expect(cookie?.httpOnly).toBe(true);
    await context.close();
  });

  test("Suchformular führt zu /suche; auf 375 px ohne horizontales Scrollen", async ({
    browser,
  }) => {
    const word = keyword();
    await indexedProviders(created, word, [{}]);
    const page = await visitor(browser, "/de", { width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
    const box = page.getByRole("combobox", { name: "Ort oder Name" });
    await box.fill(word);
    await box.press("Tab");
    await expect(box).toHaveValue(word);
    await page.getByRole("button", { name: "Suchen" }).click();
    await expect(page).toHaveURL(new RegExp(`/de/suche\\?q=${word}$`));
    await expect(heading(page)).toHaveText("1 Profil");
  });
});

test.describe("Suche speichern", () => {
  test("Mitglied speichert mit Namen aus den Filtern, der Zustand bleibt; zweiter Klick entfernt sie", async ({
    page,
    baseURL,
  }) => {
    const account = await createAccount(undefined, "Suchmitglied Fiktiv");
    created.push(account.id);
    await signInAs(page, account, baseURL);
    const word = keyword();
    await indexedProviders(created, word, [{ languages: ["de"] }]);
    await page.goto(
      `/de/suche?q=${word}&ort=stadt-zuerich&sprache=de&sortierung=neu`,
    );
    const button = page.getByRole("button", { name: "Suche speichern" });
    await button.click();
    await expect(
      page.getByRole("button", { name: "Suche gespeichert" }),
    ).toHaveAttribute("aria-pressed", "true");
    const [saved] = await query<{
      name: string;
      query: Record<string, unknown>;
    }>(`select name, query from saved_search where "userId" = $1`, [
      account.id,
    ]);
    expect(saved?.name).toBe(`«${word}» · Zürich · Deutsch`);
    expect(saved?.query).not.toHaveProperty("sortierung");

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Suche gespeichert" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Suche gespeichert" }).click();
    await expect(
      page.getByRole("button", { name: "Suche speichern" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(
        async () =>
          (
            await query(`select 1 from saved_search where "userId" = $1`, [
              account.id,
            ])
          ).length,
      )
      .toBe(0);
  });

  test("Besucher: «Suche speichern» führt zur Anmeldung mit Rückweg; ohne Filter kein Button", async ({
    browser,
  }) => {
    const page = await visitor(browser, "/de/suche?sprache=de");
    await expect(
      page.getByRole("link", { name: "Suche speichern" }),
    ).toHaveAttribute(
      "href",
      /\/de\/anmelden\?weiter=%2Fde%2Fsuche%3Fsprache%3Dde/,
    );
    await page.goto("/de/suche");
    await expect(
      page.getByRole("button", { name: "Suche speichern" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Suche speichern" }),
    ).toHaveCount(0);
  });
});

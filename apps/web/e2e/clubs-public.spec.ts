import { cleanup } from "./admin-fixtures";
import {
  cleanupClubs,
  createLink,
  createLocation,
  createOrganization,
  linkedProviders,
} from "./clubs-fixtures";
import { keyword, visitor } from "./search-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Öffentliche Seiten der Clubs und Agenturen (v2 7.1, 9.4, Entscheid 0018):
 * `/c/[slug]`, `/c/[slug]/team`, `/c/[slug]/standorte/[id]`, `/clubs`,
 * «Clubs in der Nähe» auf Entdecken und «Verknüpft mit» auf dem Profil.
 */
const created: string[] = [];
test.afterAll(async () => {
  await cleanupClubs();
  await cleanup(created);
});

test.describe("Clubseite (v2 9.4)", () => {
  test("zeigt nur aktive, öffentliche Anbieter; Öffnungszeiten, Ausnahme, Signal und Kontakt", async ({
    browser,
  }) => {
    const club = await createOrganization();
    const location = await createLocation(club);
    const [active, invited, paused, general] = await linkedProviders(
      created,
      4,
      [2],
    );
    if (!active || !invited || !paused || !general)
      throw new Error("Anbieter fehlen");
    await createLink(club, active, "ACTIVE", { location });
    await createLink(club, invited, "INVITED", { location });
    await createLink(club, paused, "ACTIVE", { location });
    await createLink(club, general, "ACTIVE");

    const page = await visitor(browser, `/de/c/${club.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: club.name }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Brotkrumen" }),
    ).toContainText("Clubs und Agenturen");
    await expect(
      page.locator("#inhalt").getByText("Club · Zürich"),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Erklärung zu «Geschäftsidentität geprüft» anzeigen",
      })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Geschäftsidentität geprüft" }),
    ).toContainText("Was das Signal nicht aussagt");
    await page.keyboard.press("Escape");

    const providers = page.locator("[data-club-providers]");
    await expect(
      providers.getByRole("heading", { name: active.displayName }),
    ).toBeVisible();
    await expect(
      providers.getByRole("heading", { name: general.displayName }),
    ).toBeVisible();
    await expect(providers).not.toContainText(invited.displayName);
    await expect(providers).not.toContainText(paused.displayName);
    await expect(providers.getByRole("link").first()).toHaveAttribute(
      "href",
      /\/de\/p\//,
    );
    await expect(
      providers.getByRole("button", {
        name: `${active.displayName} als Favorit speichern`,
      }),
    ).toBeVisible();

    const card = page.locator(`[data-location="${location.id}"]`);
    await expect(
      card.getByRole("heading", { name: location.name }),
    ).toBeVisible();
    await expect(card).toContainText("Zürich · Kreis 4");
    await expect(card.locator("[data-today-status=open]")).toHaveText(
      /Heute geöffnet bis 23:59/,
    );
    await expect(card.getByRole("row", { name: /Freitag/ })).toContainText(
      "22:00–02:00",
    );
    await expect(card.getByRole("row", { name: /Samstag/ })).toContainText(
      "Geschlossen",
    );
    await expect(card).toContainText("Fiktiv: Betriebsferien");

    const contact = page.getByRole("region", { name: "Kontakt" });
    await expect(
      contact.getByRole("link", { name: /fiktiv\.example/ }).first(),
    ).toHaveAttribute("href", "https://fiktiv.example");
    await expect(
      contact.getByRole("link", { name: "kontakt@fiktiv.example" }),
    ).toHaveAttribute("href", "mailto:kontakt@fiktiv.example");
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      new RegExp(`/de/c/${club.slug}$`),
    );
    expect(await page.content()).not.toContain("@fiktiv.test");
    await expectNoSeriousAxeFindings(page);

    await card
      .getByRole("link", { name: `Standort ${location.name} ansehen` })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/de/c/${club.slug}/standorte/${location.id}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: location.name }),
    ).toBeVisible();
    const atLocation = page.locator("[data-club-providers]");
    await expect(
      atLocation.getByRole("heading", { name: active.displayName }),
    ).toBeVisible();
    await expect(atLocation).not.toContainText(general.displayName);
    await expect(atLocation).not.toContainText(paused.displayName);
    await expect(
      page.getByText("Alle Zeiten in Schweizer Ortszeit."),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.goto(`/de/c/${club.slug}/team`);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: `Anbieter bei ${club.name}`,
      }),
    ).toBeVisible();
    await expect(page.locator("[data-club-providers] > li")).toHaveCount(2);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expectNoSeriousAxeFindings(page);
  });

  test("Entwurf, unbekannte Organisation und unbekannter Standort: 404", async ({
    browser,
  }) => {
    const draft = await createOrganization({ status: "DRAFT" });
    const club = await createOrganization();
    const page = await visitor(browser, "/de");
    expect((await page.goto(`/de/c/${draft.slug}`))?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      draft.name,
    );
    expect((await page.goto("/de/c/gibt-es-nicht-fiktiv"))?.status()).toBe(404);
    expect(
      (await page.goto(`/de/c/${club.slug}/standorte/gibt-es-nicht`))?.status(),
    ).toBe(404);
    expect((await page.goto(`/de/c/${draft.slug}/team`))?.status()).toBe(404);
  });

  test("ohne Anbieter: ehrlicher Leerzustand; 375 px ohne horizontales Scrollen", async ({
    browser,
  }) => {
    const club = await createOrganization({ kind: "AGENCY" });
    await createLocation(club, { region: "stadt-bern" });
    const page = await visitor(browser, `/de/c/${club.slug}`, {
      width: 375,
      height: 800,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: club.name }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Hier erscheinen Anbieter, sobald sie eine Verknüpfung angenommen haben.",
      ),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Liste /clubs (v2 7.1)", () => {
  test("Filter Art und Region stehen in der URL; Kanton findet Städte; Leerzustand bei keinen Treffern", async ({
    browser,
  }) => {
    const word = keyword();
    const club = await createOrganization({ name: `${word} Club Fiktiv` });
    const agency = await createOrganization({
      name: `${word} Agentur Fiktiv`,
      kind: "AGENCY",
    });
    await createLocation(club, { region: "stadt-zuerich" });
    await createLocation(agency, { region: "stadt-bern" });
    const [provider] = await linkedProviders(created, 1);
    if (provider) await createLink(club, provider, "ACTIVE");

    const page = await visitor(browser, "/de/clubs");
    const list = page.locator("[data-club-list]");
    await expect(
      page.getByRole("heading", { level: 1, name: "Clubs und Agenturen" }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: new RegExp(club.name) }),
    ).toContainText("1 verknüpfter Anbieter");
    await expect(
      list.getByRole("link", { name: new RegExp(agency.name) }),
    ).toContainText("Agentur · Bern");

    await page
      .getByRole("navigation", { name: "Art" })
      .getByRole("link", { name: "Agenturen" })
      .click();
    await expect(page).toHaveURL(/\/de\/clubs\?art=agentur$/);
    await expect(
      list.getByRole("link", { name: new RegExp(agency.name) }),
    ).toBeVisible();
    await expect(list).not.toContainText(club.name);

    await page.goto("/de/clubs?region=zuerich");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Clubs und Agenturen in Zürich",
      }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: new RegExp(club.name) }),
    ).toBeVisible();
    await expect(list).not.toContainText(agency.name);

    await page.getByLabel("Region", { exact: true }).selectOption("stadt-bern");
    await page.getByRole("button", { name: "Region anzeigen" }).click();
    await expect(page).toHaveURL(/region=stadt-bern/);
    await expect(
      list.getByRole("link", { name: new RegExp(agency.name) }),
    ).toBeVisible();

    await page.goto("/de/clubs?art=agentur&region=waadt");
    await expect(
      page.getByText("Für diese Filter gibt es keine Clubs oder Agenturen."),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Filter zurücksetzen" })
      .last()
      .click();
    await expect(page).toHaveURL(/\/de\/clubs$/);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("Entdecken zeigt «Clubs in der Nähe» für die gewählte Region", async ({
    browser,
  }) => {
    const club = await createOrganization();
    await createLocation(club, { region: "stadt-genf" });
    const page = await visitor(browser, "/de");
    await page
      .context()
      .addCookies([
        {
          name: "region",
          value: "stadt-genf",
          url: new URL(page.url()).origin,
        },
      ]);
    await page.goto("/de");
    const row = page.getByRole("region", { name: "Clubs in der Nähe" });
    await expect(
      row.getByRole("link", { name: new RegExp(club.name) }),
    ).toHaveAttribute("href", `/de/c/${club.slug}`);
  });
});

test.describe("Querverweis Profil und Club (v2 8.2)", () => {
  test("das Profil nennt aktive, veröffentlichte Organisationen unter «Verknüpft mit»", async ({
    browser,
  }) => {
    const club = await createOrganization();
    const invitedBy = await createOrganization();
    const draft = await createOrganization({ status: "DRAFT" });
    await createLocation(club);
    const [provider] = await linkedProviders(created, 1);
    if (!provider) throw new Error("Anbieter fehlt");
    await createLink(club, provider, "ACTIVE");
    await createLink(invitedBy, provider, "INVITED");
    await createLink(draft, provider, "ACTIVE");

    const page = await visitor(browser, `/de/p/${provider.slug}`);
    const section = page.getByRole("region", { name: "Verknüpft mit" });
    await expect(
      section.getByRole("link", { name: new RegExp(club.name) }),
    ).toHaveAttribute("href", `/de/c/${club.slug}`);
    await expect(section).not.toContainText(invitedBy.name);
    await expect(section).not.toContainText(draft.name);
    await section.getByRole("link", { name: new RegExp(club.name) }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: club.name }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-club-providers]")
        .getByRole("link", { name: new RegExp(provider.displayName) }),
    ).toHaveAttribute("href", `/de/p/${provider.slug}`);
  });
});

import { cleanup, query } from "./admin-fixtures";
import {
  cleanupClubs,
  createLink,
  createLocation,
  createOrganization,
  linkedProviders,
} from "./clubs-fixtures";
import { signedInPage } from "./messages-fixtures";
import { visitor } from "./search-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * `/studio/verknuepfungen` (v2 7.6, v1 FR-BUSINESS-003/005): Einladung
 * annehmen, dann erscheint der Anbieter auf der Clubseite; Verknüpfung lösen
 * mit Rückfrage, dann ist er weg, sein Profil bleibt erreichbar.
 */
const created: string[] = [];
test.afterAll(async () => {
  await cleanupClubs();
  await cleanup(created);
});

test.describe("Verknüpfungen im Studio", () => {
  test("annehmen, auf der Clubseite sichtbar, lösen mit Rückfrage, Profil bleibt", async ({
    browser,
    baseURL,
  }) => {
    const club = await createOrganization();
    const location = await createLocation(club);
    const draft = await createOrganization({ status: "DRAFT" });
    const [provider] = await linkedProviders(created, 1);
    if (!provider) throw new Error("Anbieter fehlt");
    const linkId = await createLink(club, provider, "INVITED", {
      location,
      message:
        "Fiktive Einladung: Wir würden dich gern auf unserer Seite zeigen.",
    });
    await createLink(draft, provider, "INVITED");

    const page = await signedInPage(browser, provider, baseURL);
    await page.goto("/de/studio/verknuepfungen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Verknüpfungen" }),
    ).toBeVisible();
    await expect(page.getByText("Was die Organisation sieht")).toBeVisible();
    await expect(
      page.getByText(
        /Nie deine Nachrichten, Ausweisdaten, Anfragen oder deinen Kalender/,
      ),
    ).toBeVisible();
    // Seitenleiste: Eintrag mit Zahl der offenen Einladungen.
    await expect(
      page
        .getByRole("link", { name: /Verknüpfungen.*2 offene Einladungen/ })
        .first(),
    ).toBeAttached();

    const invitations = page.locator("[data-invitations]");
    const row = invitations.locator(`[data-link="${linkId}"]`);
    await expect(row.getByRole("link", { name: club.name })).toHaveAttribute(
      "href",
      `/de/c/${club.slug}`,
    );
    await expect(row).toContainText(
      `Club · Standort ${location.name} · Eingeladen am`,
    );
    await expect(row).toContainText("Fiktive Einladung");
    // Eine noch nicht veröffentlichte Organisation erscheint ohne Link.
    await expect(invitations.getByText(draft.name)).toBeVisible();
    await expect(
      invitations.getByRole("link", { name: draft.name }),
    ).toHaveCount(0);
    await expect(invitations).toContainText("Seite noch nicht veröffentlicht");
    await expectNoSeriousAxeFindings(page);

    await row
      .getByRole("button", { name: `Einladung von ${club.name} annehmen` })
      .click();
    await expect(
      page.getByText(`Du bist jetzt mit ${club.name} verknüpft.`, {
        exact: true,
      }),
    ).toBeVisible();
    const active = page.locator("[data-active-links]");
    await expect(active.getByRole("link", { name: club.name })).toBeVisible();
    await expect(active).toContainText("Verknüpft seit");
    expect(
      (
        await query<{ status: string }>(
          `select status from organization_link where id = $1`,
          [linkId],
        )
      )[0]?.status,
    ).toBe("ACTIVE");

    const visitorPage = await visitor(browser, `/de/c/${club.slug}`);
    await expect(
      visitorPage
        .locator("[data-club-providers]")
        .getByRole("heading", { name: provider.displayName }),
    ).toBeVisible();
    await visitorPage.goto(`/de/c/${club.slug}/standorte/${location.id}`);
    await expect(
      visitorPage
        .locator("[data-club-providers]")
        .getByRole("heading", { name: provider.displayName }),
    ).toBeVisible();

    await active
      .getByRole("button", { name: `Verknüpfung mit ${club.name} lösen` })
      .click();
    const dialog = page.getByRole("alertdialog", {
      name: `Verknüpfung mit ${club.name} lösen?`,
    });
    await expect(dialog).toContainText(
      "Dein Konto und dein Profil bleiben bestehen.",
    );
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    await expect(dialog).toHaveCount(0);
    await active
      .getByRole("button", { name: `Verknüpfung mit ${club.name} lösen` })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Verknüpfung lösen" })
      .click();
    await expect(
      page.getByText(`Verknüpfung mit ${club.name} gelöst.`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Du bist mit keinem Club und keiner Agentur verknüpft."),
    ).toBeVisible();

    await visitorPage.goto(`/de/c/${club.slug}`);
    await expect(visitorPage.locator("#inhalt")).not.toContainText(
      provider.displayName,
    );
    const profile = await visitorPage.goto(`/de/p/${provider.slug}`);
    expect(profile?.status()).toBe(200);
    await expect(
      visitorPage.getByRole("heading", {
        level: 1,
        name: provider.displayName,
      }),
    ).toBeVisible();
    await expect(
      visitorPage.getByRole("region", { name: "Verknüpft mit" }),
    ).toHaveCount(0);
  });

  test("ablehnen; 375 px ohne horizontales Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const club = await createOrganization({ kind: "AGENCY" });
    const [provider] = await linkedProviders(created, 1);
    if (!provider) throw new Error("Anbieter fehlt");
    const linkId = await createLink(club, provider, "INVITED");
    const page = await signedInPage(browser, provider, baseURL, {
      viewport: { width: 375, height: 800 },
    });
    await page.goto("/de/studio/verknuepfungen");
    await expect(page.locator(`[data-link="${linkId}"]`)).toContainText(
      "Agentur",
    );
    await expectNoHorizontalScroll(page);
    await page
      .getByRole("button", { name: `Einladung von ${club.name} ablehnen` })
      .click();
    await expect(
      page.getByText(`Einladung von ${club.name} abgelehnt.`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Keine offenen Einladungen.")).toBeVisible();
    expect(
      (
        await query<{ status: string }>(
          `select status from organization_link where id = $1`,
          [linkId],
        )
      )[0]?.status,
    ).toBe("DECLINED");
    await expectNoSeriousAxeFindings(page);
  });
});

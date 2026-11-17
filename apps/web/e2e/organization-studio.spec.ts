import { query } from "./admin-fixtures";
import {
  cleanupOrganizations,
  createOrganization,
  openAs,
  member,
} from "./organization-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Studio der Organisation (v2 7.7, 12.2; Entscheid 0018): Rollen, Profil,
 * Standorte mit Öffnungszeiten und Ausnahmen, fremde Organisationen. Jeder
 * Test legt eine eigene fiktive Organisation an.
 */
const organizations: string[] = [];
const users: string[] = [];
test.afterEach(async () => cleanupOrganizations(organizations, users));

async function organization(
  roles: Parameters<typeof createOrganization>[0],
  status: "DRAFT" | "PUBLISHED" = "DRAFT",
) {
  const created = await createOrganization(roles, { status, created: users });
  organizations.push(created.id);
  return created;
}

test.describe("Studio der Organisation: Rollen und Zugang", () => {
  test("Inhaber sieht die Aktionen, Terminorganisation sieht sie nicht und liest den Grund", async ({
    page,
  }) => {
    const org = await organization(["OWNER", "SCHEDULING"]);
    const base = `/de/studio/o/${org.slug}`;
    await openAs(page, member(org, "OWNER"), base);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `Heute bei ${org.name}`,
    );
    await expect(page.locator("[data-todo=nachweise]")).toContainText(
      "Nachweise einreichen",
    );
    await expect(page.locator("[data-todo=standorte]")).toContainText(
      "Noch kein Standort",
    );
    const sidebar = page.locator("[data-studio-sidebar]");
    await expect(sidebar.getByRole("link")).toContainText([
      "Heute",
      "Unternehmensprofil",
      "Standorte",
      "Anbieter",
      "Medien",
      "Nachweise",
      "Einstellungen",
    ]);
    await expect(sidebar.getByRole("link", { name: "Team" })).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    await page.goto(`${base}/anbieter`);
    await expect(page.getByRole("button", { name: "Einladen" })).toBeVisible();
    await page.goto(`${base}/standorte`);
    await expect(
      page.getByRole("button", { name: "Standort hinzufügen" }),
    ).toBeVisible();
    await page.goto(`${base}/nachweise`);
    await expect(
      page.getByRole("button", { name: "Nachweise einreichen" }),
    ).toBeVisible();

    await openAs(page, member(org, "SCHEDULING"), `${base}/profil`);
    await expect(page.locator("[data-permission-note]")).toContainText(
      "Deine Rolle kann das Profil nur ansehen.",
    );
    await expect(
      page.getByRole("button", { name: "Profil speichern" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
    await page.goto(`${base}/anbieter`);
    await expect(page.getByRole("button", { name: "Einladen" })).toHaveCount(0);
    await expect(page.locator("[data-permission-note]")).toContainText(
      "Das können Inhaber und Standortmanager.",
    );
    await page.goto(`${base}/standorte`);
    await expect(
      page.getByRole("button", { name: "Standort hinzufügen" }),
    ).toHaveCount(0);
    await page.goto(`${base}/nachweise`);
    await expect(page.locator("[data-verification-form]")).toHaveCount(0);
    await expect(page.locator("[data-permission-note]")).toContainText(
      "Nachweise reicht der Inhaber der Organisation ein.",
    );
    await page.goto(`${base}/einstellungen`);
    await expect(page.locator("[data-organization-role]")).toHaveText(
      "Terminorganisation",
    );
    await expect(
      page.getByText(
        "Benachrichtigungen kommen mit dem Modul Benachrichtigungen",
        { exact: false },
      ),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });

  test("fremde und unbekannte Organisationen und Standorte ergeben eine 404", async ({
    page,
  }) => {
    const own = await organization(["OWNER"]);
    const other = await organization(["OWNER"]);
    const [location] = await query<{ id: string }>(
      `insert into location (id, "organizationId", name, "updatedAt") values ('e2e_loc_' || md5(random()::text), $1, 'Fremder Standort Fiktiv', now()) returning id`,
      [other.id],
    );
    await openAs(page, member(own, "OWNER"), `/de/studio/o/${own.slug}`);
    for (const path of [
      `/de/studio/o/${other.slug}`,
      `/de/studio/o/${other.slug}/profil`,
      `/de/studio/o/${own.slug}/standorte/${location?.id}`,
      `/de/studio/o/${own.slug}/standorte/unbekannt`,
      `/de/studio/o/${own.slug}/medien/unbekannt`,
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});

test.describe("Studio der Organisation: Profil und Standorte", () => {
  test("Profil speichern mit Fehler am Feld", async ({ page }) => {
    const org = await organization(["OWNER"]);
    await openAs(page, member(org, "OWNER"), `/de/studio/o/${org.slug}/profil`);
    await expect(page.locator("[data-organization-status]")).toHaveText(
      "Entwurf, nicht öffentlich",
    );
    await page.getByLabel("Website").fill("example.ch");
    await page
      .getByLabel("Über uns")
      .fill("Fiktiver Club für einen Test, mit Bar und Lounge.");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(
      page
        .getByText("Gib eine vollständige Adresse mit https:// ein", {
          exact: false,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByLabel("Website")).toBeFocused();
    await page.getByLabel("Website").fill("https://fiktiv-club.example.ch");
    await page.getByLabel("Name", { exact: true }).fill(`${org.name} Neu`);
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(
      page.getByText("Profil gespeichert", { exact: true }),
    ).toBeVisible();
    const [row] = await query<{
      name: string;
      website: string;
      description: string;
    }>(`select name, website, description from organization where id = $1`, [
      org.id,
    ]);
    expect(row).toEqual({
      name: `${org.name} Neu`,
      website: "https://fiktiv-club.example.ch",
      description: "Fiktiver Club für einen Test, mit Bar und Lounge.",
    });
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("Standort mit Öffnungszeiten, Ausnahme und Löschen nach Rückfrage", async ({
    page,
  }) => {
    const org = await organization(["LOCATION_MANAGER"], "PUBLISHED");
    const base = `/de/studio/o/${org.slug}/standorte`;
    await openAs(page, member(org, "LOCATION_MANAGER"), base);
    await expect(page.getByText("Noch kein Standort")).toBeVisible();
    await page.getByRole("button", { name: "Standort hinzufügen" }).click();
    const dialog = page.getByRole("dialog", { name: "Standort hinzufügen" });
    await dialog.getByRole("button", { name: "Standort anlegen" }).click();
    await expect(
      dialog.getByText("Bitte ausfüllen, mindestens 2 Zeichen.").first(),
    ).toBeVisible();
    await dialog
      .getByLabel("Name des Standorts")
      .fill("Club Fiktiv Langstrasse");
    await dialog.getByLabel("Allgemeine Ortsangabe").fill("Kreis 4");
    await dialog.getByRole("button", { name: "Standort anlegen" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Club Fiktiv Langstrasse" }),
    ).toBeVisible();
    const [location] = await query<{ id: string; areaLabel: string }>(
      `select id, "areaLabel" from location where "organizationId" = $1`,
      [org.id],
    );
    expect(location?.areaLabel).toBe("Kreis 4");
    await page.waitForLoadState("networkidle");

    const hours = page.locator("[data-hours-form]");
    await hours.getByRole("switch", { name: "Freitag geöffnet" }).click();
    await hours
      .getByRole("button", { name: "Öffnungszeiten speichern" })
      .click();
    await expect(hours.getByText("Öffnungszeiten gespeichert")).toBeVisible();
    expect(
      await query(
        `select weekday, "startMinute", "endMinute" from opening_hours where "locationId" = $1`,
        [location?.id],
      ),
    ).toEqual([{ weekday: 5, startMinute: 1080, endMinute: 1380 }]);
    // Wochentag 0 = Sonntag (Entscheid 0018): «Freitag» im Studio ist Freitag auf der öffentlichen Seite.
    await page.goto(`/de/c/${org.slug}/standorte/${location?.id}`);
    await expect(page.getByRole("row", { name: /Freitag/ })).toContainText(
      /18:00.23:00/,
    );
    await expect(page.getByRole("row", { name: /Samstag/ })).not.toContainText(
      "18:00",
    );
    await page.goBack();
    await page.waitForLoadState("networkidle");

    const exception = page.locator("[data-exception-form]");
    await exception.getByRole("button", { name: "Ausnahme speichern" }).click();
    await expect(exception.getByText("Wähle einen Tag.")).toBeVisible();
    await exception.getByLabel("Tag", { exact: true }).fill("24.12.2030");
    await exception.getByLabel("Notiz").fill("Weihnachten");
    await exception.getByRole("button", { name: "Ausnahme speichern" }).click();
    const row = page.locator("[data-exception-list] li");
    await expect(row).toContainText("24.12.2030");
    await expect(row).toContainText("Geschlossen");
    await expect(row).toContainText("Weihnachten");
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.getByRole("button", { name: "Standort löschen" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(
      "Öffnungszeiten und Ausnahmen gehen verloren",
    );
    await confirm.getByRole("button", { name: "Standort löschen" }).click();
    await expect(page).toHaveURL(new RegExp(`${base}$`));
    await expect(page.getByText("Noch kein Standort")).toBeVisible();
    expect(
      await query(`select id from location where "organizationId" = $1`, [
        org.id,
      ]),
    ).toEqual([]);
  });
});

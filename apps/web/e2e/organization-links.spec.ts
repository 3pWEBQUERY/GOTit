import { query } from "./admin-fixtures";
import {
  cleanupOrganizations,
  createOrganization,
  createPublishedProvider,
  openAs,
  member,
} from "./organization-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Anbieter einladen und Verknüpfungen lösen (v1 FR-BUSINESS-003/005, v2 12.2).
 * Die Tabelle zeigt nur öffentliche Profilangaben; aktiv wird eine Verknüpfung
 * erst mit der Zustimmung des Anbieters, hier per SQL nachgestellt.
 */
const organizations: string[] = [];
const users: string[] = [];
test.afterEach(async () => cleanupOrganizations(organizations, users));

test.describe("Anbieter der Organisation", () => {
  test("Einladen per eingefügter Profil-URL; Fehler am Feld; Einladung zurückziehen nach Rückfrage", async ({
    page,
    baseURL,
  }) => {
    const org = await createOrganization(["OWNER"], {
      status: "PUBLISHED",
      created: users,
    });
    organizations.push(org.id);
    const provider = await createPublishedProvider(users);
    await query(
      `insert into location (id, "organizationId", name, "updatedAt") values ($1, $2, 'Standort Fiktiv Nord', now())`,
      [`e2e_loc_${org.id}`, org.id],
    );
    await openAs(
      page,
      member(org, "OWNER"),
      `/de/studio/o/${org.slug}/anbieter`,
    );
    await expect(page.getByText("Noch keine Anbieter")).toBeVisible();
    await expect(
      page.getByText(
        "Nachrichten, Ausweisdaten und private Kalender der Anbieter sind für Organisationen nie zugänglich.",
        { exact: false },
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Einladen" }).click();
    const dialog = page.getByRole("dialog", { name: "Anbieter einladen" });
    const field = dialog.getByLabel("Profilname oder Profil-URL");
    await field.fill("https://example.ch/de/suche");
    await dialog.getByRole("button", { name: "Einladung senden" }).click();
    await expect(
      dialog.getByText(
        "Gib einen Profilnamen wie «lena-zh» oder eine Profil-URL mit /p/ ein.",
      ),
    ).toBeVisible();
    await field.fill("niemand-fiktiv-unbekannt");
    // Erst verlassen: Der Fehler am Feld verschwindet beim Verlassen und verschiebt den Button.
    await field.blur();
    await dialog.getByRole("button", { name: "Einladung senden" }).click();
    await expect(
      dialog.getByText(
        "Zu diesem Namen gibt es kein öffentliches Anbieterprofil.",
      ),
    ).toBeVisible();
    await field.fill(`${baseURL}/de/p/${provider.slug}`);
    await dialog.getByRole("combobox", { name: /Standort/ }).click();
    await page.getByRole("option", { name: "Standort Fiktiv Nord" }).click();
    await dialog
      .getByLabel(/Nachricht/)
      .fill("Fiktive Einladung zur Zusammenarbeit.");
    await dialog.getByRole("button", { name: "Einladung senden" }).click();
    await expect(
      page.getByText("Einladung gesendet", { exact: true }),
    ).toBeVisible();
    await expect(dialog).toHaveCount(0);

    const row = page.getByRole("row").filter({ hasText: provider.displayName });
    await expect(row.locator("[data-link-status]")).toHaveText("Eingeladen");
    await expect(row).toContainText("Standort Fiktiv Nord");
    await expect(
      row.getByRole("link", { name: provider.displayName }),
    ).toHaveAttribute("href", `/de/p/${provider.slug}`);
    const [link] = await query<{ id: string; status: string; message: string }>(
      `select id, status, message from organization_link where "organizationId" = $1`,
      [org.id],
    );
    expect(link).toMatchObject({
      status: "INVITED",
      message: "Fiktive Einladung zur Zusammenarbeit.",
    });

    await page.getByRole("button", { name: "Einladen" }).click();
    await dialog.getByLabel("Profilname oder Profil-URL").fill(provider.slug);
    await dialog.getByRole("button", { name: "Einladung senden" }).click();
    await expect(
      dialog.getByText("Dieser Anbieter ist schon eingeladen oder verknüpft."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    await expectNoSeriousAxeFindings(page);

    await page.goto(`/de/studio/o/${org.slug}`);
    await expect(page.locator("[data-todo=einladungen]")).toContainText(
      "Einladungen offen: 1",
    );

    await page.goto(`/de/studio/o/${org.slug}/anbieter`);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", {
        name: `Einladung zurückziehen: ${provider.displayName}`,
      })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(
      "Sein Konto und sein Profil bleiben bestehen.",
    );
    await confirm
      .getByRole("button", { name: "Einladung zurückziehen" })
      .click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: provider.displayName })
        .locator("[data-link-status]"),
    ).toHaveText("Gelöst");
    const [ended] = await query<{ status: string; endedBy: string }>(
      `select status, "endedBy" from organization_link where id = $1`,
      [link?.id],
    );
    expect(ended).toEqual({ status: "ENDED", endedBy: "ORGANIZATION" });
    expect(
      await query(`select id from provider_profile where id = $1`, [
        provider.profileId,
      ]),
    ).toHaveLength(1);
  });

  test("aktive Verknüpfung lösen; Marketing sieht die Tabelle ohne Aktionen; 375 px ohne Querscrollen", async ({
    page,
  }) => {
    const org = await createOrganization(["OWNER", "MARKETING"], {
      created: users,
    });
    organizations.push(org.id);
    const provider = await createPublishedProvider(users);
    await query(
      `insert into organization_link (id, "organizationId", "providerProfileId", status, "invitedById", "respondedAt") values ($1, $2, $3, 'ACTIVE', $4, now())`,
      [
        `e2e_link_${org.id}`,
        org.id,
        provider.profileId,
        member(org, "OWNER").id,
      ],
    );
    await openAs(
      page,
      member(org, "MARKETING"),
      `/de/studio/o/${org.slug}/anbieter`,
    );
    const row = page.getByRole("row").filter({ hasText: provider.displayName });
    await expect(row.locator("[data-link-status]")).toHaveText("Aktiv");
    await expect(page.locator("[data-end-link]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Einladen" })).toHaveCount(0);

    await openAs(
      page,
      member(org, "OWNER"),
      `/de/studio/o/${org.slug}/anbieter`,
    );
    await page
      .getByRole("button", {
        name: `Verknüpfung lösen: ${provider.displayName}`,
      })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Verknüpfung lösen" })
      .click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: provider.displayName })
        .locator("[data-link-status]"),
    ).toHaveText("Gelöst");
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});

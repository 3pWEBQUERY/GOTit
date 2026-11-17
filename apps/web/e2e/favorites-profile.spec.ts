import {
  PASSWORD,
  cleanup,
  createAccount,
  query,
  signInAs,
} from "./admin-fixtures";
import {
  createProvider,
  entryNames,
  ownCollection,
  signedInMember,
} from "./favorites-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Herz und «Zu Sammlung hinzufügen» auf der Profilseite (PRD v2 9.3, 10,
 * Entscheid 0013). Profile und Konten sind frisch und fiktiv.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Favorit auf der Profilseite", () => {
  test("Herz merkt, bleibt nach dem Neuladen gedrückt und erscheint in «Favoriten»; erneut entfernt", async ({
    page,
    baseURL,
  }) => {
    await signedInMember(page, created, baseURL);
    const provider = await createProvider(created);
    await page.goto(`/de/p/${provider.slug}`);
    await page.waitForLoadState("networkidle");
    const heart = page.getByRole("button", { name: "Favorit", exact: true });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();
    await expect(
      page.getByText("In Favoriten gespeichert", { exact: true }),
    ).toBeVisible();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Favorit", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);

    await page.goto("/de/favoriten");
    await expect.poll(() => entryNames(page)).toEqual([provider.name]);

    await page.goto(`/de/p/${provider.slug}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Favorit", exact: true }).click();
    await expect(
      page.getByText("Aus Favoriten entfernt", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Favorit", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.goto("/de/favoriten");
    await expect(
      page.locator("#inhalt").getByText("Noch keine Favoriten"),
    ).toBeVisible();
  });

  test("Besucher: Herz führt zur Anmeldung mit Rückweg und danach zurück zum Profil", async ({
    browser,
  }) => {
    const provider = await createProvider(created);
    const context = await browser.newContext();
    const page = await context.newPage();
    await confirmAge(page, `/de/p/${provider.slug}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Zu Sammlung hinzufügen" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Favorit", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `/de/anmelden\\?weiter=${encodeURIComponent(`/de/p/${provider.slug}`)}$`,
      ),
    );

    const member = await createAccount(undefined, "Besuchskonto Fiktiv");
    created.push(member.id);
    await page.waitForFunction(() => {
      const form = document.querySelector("main form");
      return (
        form !== null &&
        Object.keys(form).some((key) => key.startsWith("__react"))
      );
    });
    await page.getByLabel("E-Mail-Adresse").fill(member.email);
    await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Mit E-Mail anmelden" }).click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${provider.slug}$`));
    await expect(
      page.getByRole("button", { name: "Favorit", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: "Zu Sammlung hinzufügen" }),
    ).toBeVisible();
    await context.close();
  });

  test("Zu Sammlung hinzufügen: neue Sammlung aus dem Menü, Häkchen, wieder herausnehmen", async ({
    page,
    baseURL,
  }) => {
    const member = await signedInMember(page, created, baseURL);
    const provider = await createProvider(created);
    await ownCollection(member.id, "Merkliste Fiktiv");
    await page.goto(`/de/p/${provider.slug}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Zu Sammlung hinzufügen" }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Merkliste Fiktiv" }),
    ).toHaveAttribute("aria-checked", "false");
    await page.getByRole("menuitem", { name: "Neue Sammlung …" }).click();
    const dialog = page.getByRole("dialog", { name: "Neue Sammlung anlegen" });
    await dialog
      .getByRole("textbox", { name: "Name der Sammlung" })
      .fill("Merkliste Fiktiv");
    await dialog.getByRole("button", { name: "Sammlung anlegen" }).click();
    await expect(
      dialog.getByText("Du hast schon eine Sammlung mit diesem Namen."),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Name der Sammlung" })
      .fill("Wochenende Fiktiv");
    await dialog.getByRole("button", { name: "Sammlung anlegen" }).click();
    await expect(
      page.getByText(
        "Sammlung «Wochenende Fiktiv» angelegt und Profil hinzugefügt",
        { exact: true },
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Zu Sammlung hinzufügen" }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Wochenende Fiktiv" }),
    ).toHaveAttribute("aria-checked", "true");
    await page
      .getByRole("menuitemcheckbox", { name: "Merkliste Fiktiv" })
      .click();
    await expect(
      page.getByText("Zu «Merkliste Fiktiv» hinzugefügt", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Zu Sammlung hinzufügen" }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Merkliste Fiktiv" }),
    ).toHaveAttribute("aria-checked", "true");
    await page
      .getByRole("menuitemcheckbox", { name: "Wochenende Fiktiv" })
      .click();
    await expect(
      page.getByText("Aus «Wochenende Fiktiv» entfernt", { exact: true }),
    ).toBeVisible();
    // Das Herz gilt nur «Favoriten»; die Sammlungen sind davon unabhängig.
    await expect(
      page.getByRole("button", { name: "Favorit", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    const [count] = await query<{ count: string }>(
      `select count(*) from favorite f join collection c on c.id = f."collectionId" where c."userId" = $1`,
      [member.id],
    );
    expect(Number(count?.count)).toBe(1);
  });

  test("Inhaber sieht kein Herz, auch nicht in der Studio-Vorschau", async ({
    page,
  }) => {
    const provider = await createProvider(created);
    await signInAs(page, {
      id: provider.userId,
      email:
        (
          await query<{ email: string }>(
            `select email from "user" where id = $1`,
            [provider.userId],
          )
        )[0]?.email ?? "",
      name: "",
    });
    await page.goto(`/de/p/${provider.slug}`);
    await expect(page.locator("[data-owner-bar]")).toBeVisible();
    await expect(page.locator("[data-profile-favorite]")).toHaveCount(0);
    await page.goto("/de/studio/profil/beschreibung");
    await expect(
      page.locator("#inhalt [data-preview-frame]").first(),
    ).toContainText(provider.name);
    await expect(page.locator("[data-profile-favorite]")).toHaveCount(0);
  });
});

import { cleanup, query } from "./admin-fixtures";
import {
  addEntries,
  createProvider,
  defaultCollection,
  entryNames,
  ownCollection,
  signedInMember,
  untilSaved,
} from "./favorites-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * `/favoriten` und `/favoriten/[sammlung]` (PRD v1 5.6, v2 7.5 und 12.1,
 * Entscheid 0013). Jeder Test hat ein frisches, fiktives Mitglied.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Favoriten und Sammlungen", () => {
  test("leer: ein Satz und der Weg zu Entdecken; axe, 375 px ohne horizontales Scrollen", async ({
    page,
    baseURL,
  }) => {
    await signedInMember(page, created, baseURL);
    await page.goto("/de/favoriten");
    await expect(
      page.getByRole("heading", { level: 1, name: "Favoriten" }),
    ).toBeVisible();
    await expect(
      page.locator("#inhalt").getByText("Noch keine Favoriten"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Profile entdecken" }),
    ).toHaveAttribute("href", "/de");
    await expect(
      page
        .getByRole("navigation", { name: "Sammlungen" })
        .getByRole("link", { name: /Favoriten/ }),
    ).toHaveAttribute("aria-current", "page");
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("Sammlung anlegen, leerer und doppelter Name am Feld, umbenennen, löschen mit Rückfrage", async ({
    page,
    baseURL,
  }) => {
    await signedInMember(page, created, baseURL);
    await page.goto("/de/favoriten");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Neue Sammlung" }).click();
    const dialog = page.getByRole("dialog", { name: "Neue Sammlung anlegen" });
    await dialog.getByRole("button", { name: "Sammlung anlegen" }).click();
    await expect(dialog.getByText("Gib einen Namen ein.")).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Name der Sammlung" }),
    ).toBeFocused();
    await dialog
      .getByRole("textbox", { name: "Name der Sammlung" })
      .fill("Reise Fiktiv");
    await dialog.getByRole("button", { name: "Sammlung anlegen" }).click();
    await expect(page).toHaveURL(/\/de\/favoriten\/[^/]+$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Reise Fiktiv" }),
    ).toBeVisible();
    await expect(
      page.locator("#inhalt").getByText("Diese Sammlung ist leer"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Neue Sammlung" }).click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Name der Sammlung" })
      .fill("  Reise   Fiktiv ");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sammlung anlegen" })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("Du hast schon eine Sammlung mit diesem Namen."),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Abbrechen" })
      .click();

    await page.getByRole("button", { name: "Umbenennen" }).click();
    const rename = page.getByRole("dialog", { name: "Sammlung umbenennen" });
    await expect(
      rename.getByRole("textbox", { name: "Name der Sammlung" }),
    ).toHaveValue("Reise Fiktiv");
    await rename
      .getByRole("textbox", { name: "Name der Sammlung" })
      .fill("Zürich Fiktiv");
    await rename.getByRole("button", { name: "Namen speichern" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Zürich Fiktiv" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Sammlungen" })
        .getByRole("link", { name: /Zürich Fiktiv/ }),
    ).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Sammlung löschen" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "Sammlung «Zürich Fiktiv» löschen?",
    });
    await expect(confirm).toContainText("endgültig entfernt");
    await expect(confirm).toContainText("deine Favoriten bleiben unberührt");
    await confirm.getByRole("button", { name: "Sammlung löschen" }).click();
    await expect(page).toHaveURL(/\/de\/favoriten$/);
    await expect(
      page
        .getByRole("navigation", { name: "Sammlungen" })
        .getByRole("link", { name: /Zürich Fiktiv/ }),
    ).toHaveCount(0);
  });

  test("Standardsammlung: kein Umbenennen und Löschen; nach oben, nach unten, entfernen mit Rückgängig, in eine andere Sammlung legen", async ({
    page,
    baseURL,
  }) => {
    const member = await signedInMember(page, created, baseURL);
    const [a, b, c] = [
      await createProvider(created),
      await createProvider(created),
      await createProvider(created),
    ];
    await addEntries(await defaultCollection(member.id), [a, b, c]);
    const other = await ownCollection(member.id, "Später Fiktiv");
    await page.goto("/de/favoriten");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Umbenennen" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Sammlung löschen" }),
    ).toHaveCount(0);
    expect(await entryNames(page)).toEqual([a.name, b.name, c.name]);
    await expect(page.getByRole("link", { name: a.name })).toHaveAttribute(
      "href",
      `/de/p/${a.slug}`,
    );

    await page.getByRole("button", { name: `Aktionen für ${a.name}` }).click();
    await expect(
      page.getByRole("menuitem", { name: "Nach oben" }),
    ).toBeDisabled();
    await untilSaved(page, () =>
      page.getByRole("menuitem", { name: "Nach unten" }).click(),
    );
    await expect.poll(() => entryNames(page)).toEqual([b.name, a.name, c.name]);
    await expect(
      page.getByRole("button", { name: `Aktionen für ${a.name}` }),
    ).toBeFocused();
    await expect(
      page.getByText(`${a.name} steht jetzt an Position 2 von 3.`),
    ).toBeAttached();

    await page.getByRole("button", { name: `Aktionen für ${c.name}` }).click();
    await untilSaved(page, () =>
      page.getByRole("menuitem", { name: "Nach oben" }).click(),
    );
    await expect.poll(() => entryNames(page)).toEqual([b.name, c.name, a.name]);
    await page.reload();
    await expect.poll(() => entryNames(page)).toEqual([b.name, c.name, a.name]);

    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: `Aktionen für ${b.name}` }).click();
    await page.getByRole("menuitemcheckbox", { name: "Später Fiktiv" }).click();
    await expect(
      page.getByText("Zu «Später Fiktiv» hinzugefügt", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Sammlungen" })
        .getByRole("link", { name: /Später Fiktiv/ }),
    ).toContainText("1");

    await page.getByRole("button", { name: `Aktionen für ${c.name}` }).click();
    await page.getByRole("menuitem", { name: "Entfernen" }).click();
    await expect.poll(() => entryNames(page)).toEqual([b.name, a.name]);
    await expect(
      page.getByText("Aus «Favoriten» entfernt", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(
      page.getByText("Wieder hinzugefügt", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => entryNames(page)).toEqual([c.name, b.name, a.name]);

    await page.goto(`/de/favoriten/${other}`);
    await expect.poll(() => entryNames(page)).toEqual([b.name]);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("gesperrtes Profil erscheint ohne Name, Bild und Link und lässt sich entfernen; pausiertes mit Hinweis", async ({
    page,
    baseURL,
  }) => {
    const member = await signedInMember(page, created, baseURL);
    const suspended = await createProvider(created);
    const paused = await createProvider(created, "PAUSED");
    await addEntries(await defaultCollection(member.id), [suspended, paused]);
    await query(
      `update provider_profile set status = 'SUSPENDED' where id = $1`,
      [suspended.profileId],
    );
    await page.goto("/de/favoriten");
    await page.waitForLoadState("networkidle");
    const row = page.locator("#inhalt [data-entry-state=unavailable]");
    await expect(row).toContainText("Profil nicht mehr verfügbar");
    await expect(row.getByRole("link")).toHaveCount(0);
    await expect(row.locator("img")).toHaveCount(0);
    await expect(page.locator("#inhalt")).not.toContainText(suspended.name);
    expect(await page.content()).not.toContain(suspended.slug);
    await expect(
      page.locator("#inhalt [data-entry-state=paused]"),
    ).toContainText("Zurzeit pausiert");
    await expect(page.getByRole("link", { name: paused.name })).toHaveAttribute(
      "href",
      `/de/p/${paused.slug}`,
    );
    await expectNoSeriousAxeFindings(page);

    await untilSaved(page, () =>
      row.getByRole("button", { name: "Entfernen" }).click(),
    );
    await expect(
      page.getByText("Aus «Favoriten» entfernt", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Rückgängig" })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(
      page.locator("#inhalt [data-entry-state=unavailable]"),
    ).toHaveCount(0);
    await expect.poll(() => entryNames(page)).toEqual([paused.name]);
  });

  test("fremde oder unbekannte Sammlung: 404", async ({ page, baseURL }) => {
    const stranger = await signedInMember(page, created, baseURL);
    const foreign = await ownCollection(stranger.id, "Fremd Fiktiv");
    await signedInMember(page, created, baseURL);
    expect((await page.goto(`/de/favoriten/${foreign}`))?.status()).toBe(404);
    await expect(page.locator("#inhalt")).not.toContainText("Fremd Fiktiv");
    expect((await page.goto("/de/favoriten/gibt-es-nicht"))?.status()).toBe(
      404,
    );
  });
});

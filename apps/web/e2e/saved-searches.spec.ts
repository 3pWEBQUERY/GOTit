import { randomUUID } from "node:crypto";
import { cleanup, query } from "./admin-fixtures";
import { signedInMember } from "./favorites-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * `/suchen` (PRD v2 7.5, v1 FR-SEARCH-005, Entscheid 0013). Die Suchen
 * entstehen per SQL wie durch «Suche speichern»: nur Filter, kanonischer Schlüssel.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

async function savedSearch(
  userId: string,
  name: string,
  params: Record<string, string | string[]>,
  key: string,
  ageMinutes = 0,
): Promise<string> {
  const id = `e2e_saved_${randomUUID()}`;
  await query(
    `insert into saved_search (id, "userId", name, query, "queryKey", "lastViewedAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, now(), now() - make_interval(mins => $6), now())`,
    [id, userId, name, JSON.stringify(params), key, ageMinutes],
  );
  return id;
}

test.describe("Gespeicherte Suchen", () => {
  test("leer: erklärt «Suche speichern» und führt zur Suche", async ({
    page,
    baseURL,
  }) => {
    await signedInMember(page, created, baseURL);
    await page.goto("/de/suchen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Gespeicherte Suchen" }),
    ).toBeVisible();
    await expect(
      page.locator("#inhalt").getByText("Noch keine gespeicherten Suchen"),
    ).toBeVisible();
    await expect(
      page.locator("#inhalt").getByText("«Suche speichern»"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Zur Suche" })).toHaveAttribute(
      "href",
      "/de/suche",
    );
    await expectNoSeriousAxeFindings(page);
  });

  test("Liste mit Beschreibung in Worten, Öffnen mit den Filtern, umbenennen, löschen mit Rückfrage", async ({
    page,
    baseURL,
  }) => {
    const member = await signedInMember(page, created, baseURL);
    await savedSearch(
      member.id,
      "Zürich Deutsch Fiktiv",
      { ort: "stadt-zuerich", sprache: ["de"] },
      "ort=stadt-zuerich&sprache=de",
      10,
    );
    await savedSearch(
      member.id,
      "Fotos Fiktiv",
      { fotos: "1", preis_max: "300", ort: "gibt-es-nicht" },
      "fotos=1&ort=gibt-es-nicht&preis_max=300",
    );
    await page.goto("/de/suchen");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("#inhalt").getByText("2 von 50 gespeichert"),
    ).toBeVisible();
    const rows = page.locator("#inhalt [data-saved-search]");
    await expect(rows.nth(0).getByRole("heading", { level: 2 })).toHaveText(
      "Fotos Fiktiv",
    );
    await expect(rows.nth(0)).toContainText(
      "Region nicht mehr verfügbar · bis CHF",
    );
    await expect(rows.nth(0)).toContainText("mit geprüften Fotos");
    const zurich = rows.filter({ hasText: "Zürich Deutsch Fiktiv" });
    await expect(zurich).toContainText("Zürich · spricht Deutsch");
    await expect(zurich).toContainText(/Gespeichert am \d{2}\.\d{2}\.\d{4}/);
    await expect(zurich.getByRole("link", { name: "Öffnen" })).toHaveAttribute(
      "href",
      "/de/suche?ort=stadt-zuerich&sprache=de",
    );
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);

    await zurich.getByRole("button", { name: "Umbenennen" }).click();
    const dialog = page.getByRole("dialog", { name: "Suche umbenennen" });
    await dialog.getByRole("textbox", { name: "Name der Suche" }).fill("   ");
    await dialog.getByRole("button", { name: "Namen speichern" }).click();
    await expect(dialog.getByText("Gib einen Namen ein.")).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Name der Suche" })
      .fill("Zürich am Abend Fiktiv");
    await dialog.getByRole("button", { name: "Namen speichern" }).click();
    await expect(
      page.getByText("Suche umbenannt", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Zürich am Abend Fiktiv" }),
    ).toBeVisible();

    const renamed = rows.filter({ hasText: "Zürich am Abend Fiktiv" });
    await renamed.getByRole("button", { name: "Löschen" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "Suche «Zürich am Abend Fiktiv» löschen?",
    });
    await expect(confirm).toContainText("endgültig entfernt");
    await confirm.getByRole("button", { name: "Abbrechen" }).click();
    await expect(rows).toHaveCount(2);
    await renamed.getByRole("button", { name: "Löschen" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Suche löschen" })
      .click();
    await expect(rows).toHaveCount(1);
    await page.reload();
    await expect(page.locator("#inhalt [data-saved-search]")).toHaveCount(1);
    const [left] = await query<{ count: string }>(
      `select count(*) from saved_search where "userId" = $1`,
      [member.id],
    );
    expect(Number(left?.count)).toBe(1);
  });

  test("fremde gespeicherte Suchen erscheinen nicht", async ({
    page,
    baseURL,
  }) => {
    const stranger = await signedInMember(page, created, baseURL);
    await savedSearch(
      stranger.id,
      "Fremde Suche Fiktiv",
      { neu: "1" },
      "neu=1",
    );
    await signedInMember(page, created, baseURL);
    await page.goto("/de/suchen");
    await expect(
      page.locator("#inhalt").getByText("Noch keine gespeicherten Suchen"),
    ).toBeVisible();
    await expect(page.locator("#inhalt")).not.toContainText(
      "Fremde Suche Fiktiv",
    );
  });
});

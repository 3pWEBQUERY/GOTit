import { cleanup, query } from "./admin-fixtures";
import {
  createMember,
  createProvider,
  signedInPage,
} from "./messages-fixtures";
import {
  REVIEW_TEXT,
  createAppointment,
  createReviewRow,
} from "./reviews-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Bewertung schreiben aus Sicht des Mitglieds (v2 12.1, v1 FR-REVIEW-001,
 * Entscheid 0017): erst nach «Stattgefunden», vier Kategorien und Text,
 * danach «Wird geprüft» und nicht öffentlich; eine Bewertung pro Termin,
 * fremde Termine sind eine 404.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Bewertungen: Mitglied", () => {
  test("vor «Stattgefunden» gibt es kein «Bewertung schreiben»; das Formular nennt den Grund", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const { requestId } = await createAppointment(member, provider, {
      status: "CONFIRMED",
      hoursAgo: -24,
    });
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/termine/${requestId}`);
    await expect(page.locator("header").getByText("Bestätigt")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Bewertung schreiben" }),
    ).toHaveCount(0);
    await page.goto(`/de/bewertungen/neu/${requestId}`);
    await expect(
      page.getByText("Dieser Termin hat noch nicht stattgefunden"),
    ).toBeVisible();
    await expect(page.locator("[data-review-form]")).toHaveCount(0);
    await page.goto("/de/bewertungen");
    await expect(
      page.getByText("Kein Termin wartet auf eine Bewertung."),
    ).toBeVisible();
    await expect(
      page.getByText("Du hast noch keine Bewertung geschrieben."),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Bewertungen: Mitglied schreibt", () => {
  test("nach «Stattgefunden»: schreiben, Fehler am Feld, senden; «Wird geprüft» und nicht auf dem Profil", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const { requestId } = await createAppointment(member, provider);
    const page = await signedInPage(browser, member, baseURL);

    // v2 12.1: In der Liste erscheint nach «Stattgefunden» «Bewertung schreiben».
    await page.goto("/de/termine?ansicht=vergangen");
    await expect(
      page.getByRole("link", {
        name: `Bewertung schreiben für ${provider.displayName}`,
      }),
    ).toHaveAttribute("href", `/de/bewertungen/neu/${requestId}`);

    await page.goto(`/de/termine/${requestId}`);
    await expect(
      page.locator("header").getByText("Stattgefunden"),
    ).toBeVisible();
    await page.getByRole("link", { name: "Bewertung schreiben" }).click();
    await expect(page).toHaveURL(`/de/bewertungen/neu/${requestId}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Bewertung für ${provider.displayName}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Was nicht in die Bewertung gehört"),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    // Ohne Wahl und mit zu kurzem Text: Fehler am Feld und oben zusammengefasst, nichts gespeichert.
    await page
      .getByRole("textbox", { name: "Deine Erfahrung" })
      .fill("Zu kurz");
    await page.getByRole("button", { name: "Bewertung senden" }).click();
    await expect(
      page.getByRole("radio", { name: "Kommunikation, 1 von 5" }),
    ).toBeFocused();
    await expect(
      page.getByRole("link", {
        name: "Gesamteindruck: Wähle einen Wert von 1 bis 5.",
      }),
    ).toBeVisible();
    await expect(page.locator("#bewertung-text-error")).toHaveText(
      "Schreib mindestens 20 Zeichen.",
    );
    await expect(
      page.getByRole("textbox", { name: "Deine Erfahrung" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      await query(`select id from review where "bookingRequestId" = $1`, [
        requestId,
      ]),
    ).toHaveLength(0);

    for (const [category, value] of [
      ["Kommunikation", 5],
      ["Zuverlässigkeit der Profilangaben", 4],
      ["Organisation", 3],
      ["Gesamteindruck", 4],
    ] as const)
      await page
        .getByRole("radio", { name: `${category}, ${value} von 5` })
        .click();
    await page
      .getByRole("textbox", { name: "Deine Erfahrung" })
      .fill(REVIEW_TEXT);
    await expect(
      page.getByText(`${REVIEW_TEXT.length} von 2000 Zeichen`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Bewertung senden" }).click();

    await expect(page).toHaveURL("/de/bewertungen?gesendet=1");
    await expect(
      page.getByText(
        "Danke. Die Bewertung wird geprüft und erscheint nach der Freigabe.",
      ),
    ).toBeVisible();
    const own = page.locator("[data-own-review]");
    await expect(own).toHaveCount(1);
    await expect(own).toContainText("Wird geprüft");
    await expect(own).toContainText(provider.displayName);
    await expect(
      own.getByRole("button", { name: "Einspruch erheben" }),
    ).toHaveCount(0);
    const [row] = await query<{
      communication: number;
      accuracy: number;
      organization: number;
      overall: number;
      status: string;
    }>(
      `select communication, accuracy, organization, overall, status::text as status from review where "bookingRequestId" = $1`,
      [requestId],
    );
    expect(row).toEqual({
      communication: 5,
      accuracy: 4,
      organization: 3,
      overall: 4,
      status: "PENDING",
    });
    await expectNoSeriousAxeFindings(page);

    // Öffentlich erst nach der Freigabe.
    await page.goto(`/de/p/${provider.slug}/bewertungen`);
    await expect(page.getByText("Noch keine Bewertungen")).toBeVisible();
    await expect(page.getByText(REVIEW_TEXT)).toHaveCount(0);

    // Der Termin zeigt «Bewertung geschrieben»; ein zweites Formular gibt es nicht.
    await page.goto(`/de/termine/${requestId}`);
    await expect(page.getByText("Bewertung geschrieben")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Bewertung schreiben" }),
    ).toHaveCount(0);
    await page.goto(`/de/bewertungen/neu/${requestId}`);
    await expect(
      page.getByText("Du hast diesen Termin schon bewertet"),
    ).toBeVisible();
    await expect(page.locator("[data-review-form]")).toHaveCount(0);
  });
});

test.describe("Bewertungen: Grenzen", () => {
  test("eine zweite Bewertung desselben Termins verweigert auch die Datenbank", async () => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const { requestId } = await createAppointment(member, provider);
    await createReviewRow(member, provider, requestId);
    await expect(createReviewRow(member, provider, requestId)).rejects.toThrow(
      /unique|duplicate/i,
    );
    const { requestId: open } = await createAppointment(member, provider, {
      status: "CONFIRMED",
    });
    await expect(createReviewRow(member, provider, open)).rejects.toThrow();
    expect(
      await query(`select id from review where "bookingRequestId" = any($1)`, [
        [requestId, open],
      ]),
    ).toHaveLength(1);
  });

  test("fremde und unbekannte Termine ergeben eine 404, auch für den Anbieter des Termins", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const stranger = await createMember(created);
    const { requestId } = await createAppointment(member, provider);
    const page = await signedInPage(browser, stranger, baseURL);
    for (const path of [
      `/de/bewertungen/neu/${requestId}`,
      "/de/bewertungen/neu/unbekannt",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByText(provider.displayName)).toHaveCount(0);
    }
    const studio = await signedInPage(browser, provider, baseURL);
    const response = await studio.goto(`/de/bewertungen/neu/${requestId}`);
    expect(response?.status()).toBe(404);
  });

  test("375 px: Liste und Formular ohne horizontales Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const { requestId } = await createAppointment(member, provider);
    const page = await signedInPage(browser, member, baseURL, {
      viewport: { width: 375, height: 800 },
    });
    await page.goto("/de/bewertungen");
    const pending = page.locator("[data-pending-reviews]");
    await expect(pending).toContainText(provider.displayName);
    await expectNoHorizontalScroll(page);
    await pending.getByRole("link", { name: "Bewertung schreiben" }).click();
    await expect(page).toHaveURL(`/de/bewertungen/neu/${requestId}`);
    await expect(
      page.getByRole("radio", { name: "Gesamteindruck, 5 von 5" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});

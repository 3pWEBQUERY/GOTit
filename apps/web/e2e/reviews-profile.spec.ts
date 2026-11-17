import type { Page } from "@playwright/test";
import { cleanup, query, signInAdmin } from "./admin-fixtures";
import { choose } from "./booking-fixtures";
import {
  createMember,
  createProvider,
  signedInPage,
} from "./messages-fixtures";
import {
  REVIEW_TEXT,
  appealRows,
  createAppointment,
  createReviewRow,
  reviewRow,
} from "./reviews-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Bewertungen auf dem Profil, im Studio und in der Moderation (v2 10.1, 12.4,
 * v1 FR-REVIEW-002 bis 004, Entscheid 0017): Freigabe, Stellungnahme direkt
 * darunter, Einspruch beider Seiten, Melden in zwei Schritten. Der Name des
 * Autors erscheint nirgends.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

async function setup(status: "PENDING" | "PUBLISHED" | "REJECTED" = "PENDING") {
  const provider = await createProvider(created);
  const member = await createMember(created);
  const { requestId } = await createAppointment(member, provider);
  const reviewId = await createReviewRow(member, provider, requestId, {
    status,
  });
  return { provider, member, requestId, reviewId };
}

async function decide(
  page: Page,
  reviewId: string,
  option: string,
  rule: RegExp,
) {
  await page.goto(`/de/admin/bewertungen/${reviewId}`);
  await page.getByRole("radio", { name: option }).click();
  await choose(page, "Regel", rule);
  await page
    .getByLabel("Begründung", { exact: true })
    .fill("Fiktive Begründung aus dem Test");
  await page.getByRole("button", { name: "Entscheid speichern" }).click();
  await expect(
    page.getByText("Entscheid gespeichert", { exact: true }),
  ).toBeVisible();
}

test.describe("Bewertungen: Profil, Studio und Moderation", () => {
  test("die Moderation gibt frei: Tab und Übersicht zeigen Datum, Verifikation und Kategorien, ohne Autor und ohne Durchschnitt", async ({
    page,
    baseURL,
    browser,
  }) => {
    const { provider, member, reviewId } = await setup();
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    created.push(moderator.id);
    await decide(page, reviewId, "Freigeben", /^R-REV-1 /);
    expect(await reviewRow(reviewId)).toMatchObject({
      status: "PUBLISHED",
      moderationReason: "R-REV-1: Fiktive Begründung aus dem Test",
    });

    const visitor = await browser.newContext();
    const view = await visitor.newPage();
    await confirmAge(view, `/de/p/${provider.slug}`);
    const tabs = view.getByRole("navigation", { name: "Bereiche des Profils" });
    await expect(
      tabs.getByRole("link", { name: "Bewertungen 1" }),
    ).toHaveAttribute("href", `/de/p/${provider.slug}/bewertungen`);
    const section = view.locator("[data-profile-reviews=section]");
    await expect(
      section.getByRole("heading", { level: 2, name: "Bewertungen (1)" }),
    ).toBeVisible();
    await section.getByRole("link", { name: "Alle ansehen" }).click();
    await expect(view).toHaveURL(`/de/p/${provider.slug}/bewertungen`);
    await expect(
      tabs.getByRole("link", { name: "Bewertungen 1" }),
    ).toHaveAttribute("aria-current", "page");
    const item = view.locator(`[data-review="${reviewId}"]`);
    await expect(item).toContainText("Nach bestätigtem Termin");
    await expect(item.locator("time")).toHaveText(/^\d{2}\.\d{2}\.\d{4}$/);
    for (const [label, value] of [
      ["Kommunikation", "5 von 5"],
      ["Zuverlässigkeit der Profilangaben", "4 von 5"],
      ["Organisation", "3 von 5"],
      ["Gesamteindruck", "4 von 5"],
    ] as const)
      await expect(
        item
          .locator("dl > div")
          .filter({ has: view.locator("dt", { hasText: label }) })
          .locator("dd"),
      ).toHaveText(value);
    await expect(item).toContainText(REVIEW_TEXT);
    const content = await view.content();
    expect(content).not.toContain(member.name);
    expect(content).not.toContain(member.email);
    await expect(view.getByText(/Durchschnitt|Sterne/)).toHaveCount(0);
    await expect(view.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    // Besucher melden über die Anmeldung mit Rückweg.
    await expect(
      item.getByRole("link", { name: "Bewertung melden" }),
    ).toHaveAttribute("href", /\/de\/anmelden\?weiter=/);
    await expectNoSeriousAxeFindings(view);
    await view.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(view);
  });
});

test.describe("Bewertungen: Stellungnahme", () => {
  test("Stellungnahme schreiben, ändern und mit Rückfrage entfernen; sie steht direkt unter der Bewertung", async ({
    browser,
    baseURL,
  }) => {
    const { provider, reviewId } = await setup("PUBLISHED");
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto("/de/studio/bewertungen");
    await expect(
      studio.getByRole("heading", { level: 1, name: "Bewertungen" }),
    ).toBeVisible();
    await expect(
      studio
        .getByRole("navigation", { name: "Studio", exact: true })
        .getByRole("link", { name: "Bewertungen" }),
    ).toHaveAttribute("aria-current", "page");
    const entry = studio.locator(`[data-received-review="${reviewId}"]`);
    await expect(entry).toContainText("Veröffentlicht");
    await expect(entry).toContainText(REVIEW_TEXT);
    await expectNoSeriousAxeFindings(studio);

    await entry
      .getByRole("button", { name: "Stellungnahme schreiben" })
      .click();
    await entry
      .getByRole("button", { name: "Stellungnahme speichern" })
      .click();
    await expect(
      entry.getByText("Schreib eine Stellungnahme oder brich ab."),
    ).toBeVisible();
    await entry
      .getByRole("textbox", { name: "Stellungnahme" })
      .fill("Danke für die fiktive Rückmeldung.");
    await entry
      .getByRole("button", { name: "Stellungnahme speichern" })
      .click();
    await expect(entry).toContainText(
      `Stellungnahme von ${provider.displayName}`,
    );
    expect((await reviewRow(reviewId))?.response).toBe(
      "Danke für die fiktive Rückmeldung.",
    );

    const view = await signedInPage(
      browser,
      await createMember(created),
      baseURL,
    );
    await view.goto(`/de/p/${provider.slug}/bewertungen`);
    const item = view.locator(`[data-review="${reviewId}"]`);
    await expect(item).toContainText(
      `Stellungnahme von ${provider.displayName}`,
    );
    await expect(item).toContainText("Danke für die fiktive Rückmeldung.");

    await entry
      .getByRole("button", { name: "Stellungnahme bearbeiten" })
      .click();
    await entry
      .getByRole("textbox", { name: "Stellungnahme" })
      .fill("Geänderte fiktive Stellungnahme.");
    await entry
      .getByRole("button", { name: "Stellungnahme speichern" })
      .click();
    await expect(entry).toContainText("Geänderte fiktive Stellungnahme.");

    await entry
      .getByRole("button", { name: "Stellungnahme entfernen" })
      .click();
    const dialog = studio.getByRole("alertdialog", {
      name: "Stellungnahme entfernen?",
    });
    await expect(dialog).toContainText("der Text geht verloren");
    await expect(
      dialog.getByRole("button", { name: "Behalten" }),
    ).toBeFocused();
    await dialog
      .getByRole("button", { name: "Stellungnahme entfernen" })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      entry.getByRole("button", { name: "Stellungnahme schreiben" }),
    ).toBeVisible();
    expect((await reviewRow(reviewId))?.response).toBeNull();
  });
});

test.describe("Bewertungen: Einspruch", () => {
  test("der Anbieter erhebt Einspruch, die Moderation entfernt: weg vom Profil, im Studio «Entfernt»", async ({
    browser,
    baseURL,
    page,
  }) => {
    const { provider, reviewId } = await setup("PUBLISHED");
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto("/de/studio/bewertungen");
    const entry = studio.locator(`[data-received-review="${reviewId}"]`);
    await entry.getByRole("button", { name: "Einspruch erheben" }).click();
    const dialog = studio.getByRole("dialog", { name: "Einspruch erheben" });
    await expect(dialog).toContainText("Bis dahin bleibt sie sichtbar.");
    await dialog.getByRole("textbox", { name: "Begründung" }).fill("kurz");
    await dialog.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(
      dialog.getByText("Schreib mindestens 10 Zeichen."),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Begründung" })
      .fill("Die Bewertung nennt fiktive, identifizierende Angaben.");
    await dialog.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(dialog).toBeHidden();
    await expect(entry.getByText("Einspruch läuft")).toBeVisible();
    await expect(
      entry.getByRole("button", { name: "Einspruch erheben" }),
    ).toHaveCount(0);
    expect(await appealRows(reviewId)).toEqual([
      {
        byRole: "PROVIDER",
        status: "OPEN",
        reason: "Die Bewertung nennt fiktive, identifizierende Angaben.",
      },
    ]);

    const moderator = await signInAdmin(page, baseURL, "TRUST_SAFETY");
    created.push(moderator.id);
    await page.goto("/de/admin/bewertungen");
    const row = page
      .locator(`[data-review-case-link^="appeal:"]`)
      .filter({ hasText: "Einspruch des Anbieters" });
    await expect(row.first()).toBeVisible();
    await page.goto(`/de/admin/bewertungen/${reviewId}`);
    await expect(page.locator("[data-appeal]")).toContainText(
      "Die Bewertung nennt fiktive, identifizierende Angaben.",
    );
    await expect(page.locator("[data-appeal]")).toContainText("Anbieter");
    await decide(page, reviewId, "Entfernen", /^R-REV-3 /);
    expect(await reviewRow(reviewId)).toMatchObject({ status: "REMOVED" });
    expect((await appealRows(reviewId))[0]?.status).toBe("UPHELD");

    await studio.goto(`/de/p/${provider.slug}/bewertungen`);
    await expect(studio.locator(`[data-review="${reviewId}"]`)).toHaveCount(0);
    await studio.goto("/de/studio/bewertungen");
    await expect(entry).toContainText("Entfernt");
    await expect(entry).toContainText("Letzter Einspruch: angenommen");
    await expect(entry.getByRole("button")).toHaveCount(0);
  });

  test("der Autor erhebt Einspruch gegen «Abgelehnt», die Moderation gibt frei", async ({
    browser,
    baseURL,
    page,
  }) => {
    const { provider, member, reviewId } = await setup("REJECTED");
    const own = await signedInPage(browser, member, baseURL);
    await own.goto("/de/bewertungen");
    const entry = own.locator(`[data-own-review="${reviewId}"]`);
    await expect(entry).toContainText("Abgelehnt");
    await entry.getByRole("button", { name: "Einspruch erheben" }).click();
    const dialog = own.getByRole("dialog", { name: "Einspruch erheben" });
    await dialog
      .getByRole("textbox", { name: "Begründung" })
      .fill("Die Bewertung enthält keine sensiblen Angaben.");
    await dialog.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(entry.getByText("Einspruch läuft")).toBeVisible();
    await expectNoSeriousAxeFindings(own);

    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    created.push(moderator.id);
    await page.goto(`/de/admin/bewertungen/${reviewId}`);
    await expect(page.getByRole("radio")).toHaveCount(1);
    await decide(page, reviewId, "Freigeben", /^R-REV-1 /);
    expect((await appealRows(reviewId))[0]?.status).toBe("UPHELD");

    await own.goto(`/de/p/${provider.slug}/bewertungen`);
    await expect(own.locator(`[data-review="${reviewId}"]`)).toContainText(
      REVIEW_TEXT,
    );
    await own.goto("/de/bewertungen");
    await expect(entry).toContainText("Veröffentlicht");
  });
});

test.describe("Bewertungen: Melden", () => {
  test("Bewertung vom Profil melden: zwei Schritte, die Meldung hängt am Fall mit Kopie", async ({
    browser,
    baseURL,
    page,
  }) => {
    const { provider, reviewId } = await setup("PUBLISHED");
    const reporter = await createMember(created);
    const view = await signedInPage(browser, reporter, baseURL);
    await view.goto(`/de/p/${provider.slug}`);
    const item = view.locator(`[data-review="${reviewId}"]`);
    await item.getByRole("button", { name: "Bewertung melden" }).click();
    const dialog = view.getByRole("dialog", { name: "Bewertung melden" });
    await dialog
      .getByRole("radio", { name: "Belästigung oder Beleidigung" })
      .click();
    await dialog.getByRole("button", { name: "Beschreibung ergänzen" }).click();
    await dialog
      .getByRole("textbox", { name: /Was ist passiert/ })
      .fill("Fiktive Beschreibung der Meldung.");
    await dialog.getByRole("button", { name: "Meldung senden" }).click();
    await expect(dialog.getByText("Meldung gesendet")).toBeVisible();
    const [report] = await query<{
      id: string;
      reason: string;
      reporterId: string;
      evidence: { text: string };
    }>(
      `select id, reason, "reporterId", evidence from report where "targetType" = 'REVIEW' and "targetId" = $1`,
      [reviewId],
    );
    expect(report).toMatchObject({
      reason: "harassment",
      reporterId: reporter.id,
      evidence: { text: REVIEW_TEXT },
    });

    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    created.push(moderator.id);
    await page.goto(`/de/admin/meldungen/${report?.id}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Meldung zu einer Bewertung",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(`Bewertung · ${provider.displayName}`),
    ).toBeVisible();
    await page.getByRole("link", { name: "Bewertung öffnen" }).click();
    await expect(page).toHaveURL(`/de/admin/bewertungen/${reviewId}`);
  });
});

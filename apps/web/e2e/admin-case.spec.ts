import type { Page } from "@playwright/test";
import { auditEvents, cleanup, createReviewCase, query, reviewState, signInAdmin } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Einzelfall (PRD 12.4, 16.1): verdeckte Prüfdetails, Entscheid mit
 * Begründung und Regel, Identität beim Freigeben erneut geprüft, ein Fall
 * nur einmal entscheidbar.
 */
const created: string[] = [];
test.afterEach(async () => {
  await cleanup(created.splice(0));
});

async function openCase(page: Page, baseURL: string | undefined, options: Parameters<typeof createReviewCase>[0] = {}) {
  const reviewer = await signInAdmin(page, baseURL, "MODERATOR");
  const review = await createReviewCase(options);
  created.push(reviewer.id, review.userId);
  await page.goto(`/de/admin/verifizierungen/${review.reviewId}`);
  await expect(page.getByRole("heading", { level: 1, name: `Prüffall ${review.displayName}` })).toBeVisible();
  return { reviewer, review };
}

async function decide(page: Page, option: string, reason: string, rule = "R-1 Angaben vollständig") {
  await page.getByRole("radio", { name: option }).click();
  await page.getByLabel("Begründung").fill(reason);
  await page.getByRole("combobox", { name: "Regel" }).click();
  await page.getByRole("option", { name: rule }).click();
}

const save = (page: Page) => page.getByRole("button", { name: "Entscheid speichern" }).click();

test.describe("Einzelfall", () => {
  test("zeigt die Angaben; Prüfdetails verdeckt, Aufdecken nur mit Grund und mit Audit-Eintrag", async ({ page, baseURL }) => {
    const { reviewer, review } = await openCase(page, baseURL);
    const facts = page.getByRole("region", { name: "Angaben" });
    await expect(facts).toContainText(review.displayName);
    await expect(facts).toContainText("Fiktive Beschreibung");
    await expect(facts).toContainText("Deutsch, Französisch");
    await expect(facts.getByRole("table", { name: "Preise" })).toContainText("60 Minuten");
    await expect(facts).toContainText("Dies ist der erste Fall zu diesem Profil.");

    const identity = page.getByRole("region", { name: "Prüfdetails der Identität" });
    await expect(identity).toContainText("Die Prüfdetails sind verdeckt.");
    await expect(identity.locator("[data-identity-details]")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    await identity.getByRole("button", { name: "Prüfdetails aufdecken" }).click();
    await expect(identity.getByText("Gib einen Grund mit mindestens 10 Zeichen an.")).toBeVisible();
    await expect(identity.getByLabel("Grund für das Aufdecken")).toBeFocused();
    expect(await auditEvents(review.reviewId, "identity.reveal")).toHaveLength(0);

    await identity.getByLabel("Grund für das Aufdecken").fill("Ablauf der Prüfung kontrollieren");
    await identity.getByRole("button", { name: "Prüfdetails aufdecken" }).click();
    const details = identity.locator("[data-identity-details]");
    await expect(details).toContainText("Die Identitätsprüfung ist gültig.");
    await expect(details).toContainText("Volljährig");
    await expect(details).toContainText("Bestanden");
    await expect(details).toContainText("test");
    await expect(details.getByText(/^\d{2}\.\d{2}\.\d{4}/).first()).toBeVisible();
    expect(await auditEvents(review.reviewId, "identity.reveal")).toEqual([{ actorId: reviewer.id, reason: "Ablauf der Prüfung kontrollieren" }]);
    await expectNoSeriousAxeFindings(page);
  });

  test("Freigeben: Profil öffentlich, Audit-Eintrag mit Regel und Begründung, weiter zum nächsten Fall", async ({ page, baseURL }) => {
    const { reviewer, review } = await openCase(page, baseURL);
    await save(page);
    await expect(page.getByText("Wähle einen Entscheid.").first()).toBeVisible();
    await expect(page.getByText("Wähle die Regel, auf die sich der Entscheid stützt.").first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "Freigeben" })).toBeFocused();

    await decide(page, "Freigeben", "Alle Angaben sind vollständig und plausibel.");
    await save(page);
    await expect(page).not.toHaveURL(new RegExp(review.reviewId));
    await expect(page.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: "APPROVED", status: "PUBLISHED", rule: "R-1" });
    expect(await auditEvents(review.reviewId, "profile_review.approved")).toEqual([{ actorId: reviewer.id, reason: "R-1: Alle Angaben sind vollständig und plausibel." }]);

    await page.goto(`/de/admin/verifizierungen/${review.reviewId}`);
    const readonly = page.locator("[data-decision-readonly]");
    await expect(readonly).toContainText("Freigegeben");
    await expect(readonly).toContainText("R-1 Angaben vollständig");
    await expect(page.locator("[data-decision-form]")).toHaveCount(0);
  });

  test("Zur Korrektur verlangt einen Grund je Bereich und speichert ihn", async ({ page, baseURL }) => {
    const { review } = await openCase(page, baseURL);
    await decide(page, "Zur Korrektur", "Die Regionen passen nicht zum Angebot.", "R-3 Region unzulässig");
    await save(page);
    const groupError = page.getByText("Nenne bei «Zur Korrektur» mindestens einen Bereich mit Grund.");
    await expect(groupError.first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Gründe je Bereich" })).toContainText("Nenne bei «Zur Korrektur» mindestens einen Bereich mit Grund.");
    await expect(page.getByLabel("Regionen")).toBeFocused();
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: null, status: "SUBMITTED" });

    await page.getByLabel("Regionen").fill("Bitte nur Regionen wählen, in denen du arbeitest.");
    await save(page);
    await expect(page).not.toHaveURL(new RegExp(review.reviewId));
    expect(await reviewState(review.reviewId)).toMatchObject({
      decision: "CHANGES_REQUESTED",
      status: "CHANGES_REQUESTED",
      rule: "R-3",
      fieldNotes: { regions: "Bitte nur Regionen wählen, in denen du arbeitest." },
    });
  });

  test("Ablehnen sperrt das Profil", async ({ page, baseURL }) => {
    const { review } = await openCase(page, baseURL);
    await decide(page, "Ablehnen", "Das Profil verstösst gegen die Richtlinien.", "R-5 Verstoss gegen Richtlinien");
    await save(page);
    await expect(page).not.toHaveURL(new RegExp(review.reviewId));
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: "REJECTED", status: "SUSPENDED", rule: "R-5" });
    expect(await auditEvents(review.reviewId, "profile_review.rejected")).toHaveLength(1);
  });

  test("Freigeben bei abgelaufener Identität: klare Meldung, Status unverändert", async ({ page, baseURL }) => {
    const { review } = await openCase(page, baseURL, { identity: "expired" });
    await decide(page, "Freigeben", "Alle Angaben sind vollständig und plausibel.");
    await save(page);
    await expect(page.getByRole("alert").filter({ hasText: "Die Identitätsprüfung ist nicht gültig. Freigeben ist nicht möglich." })).toBeVisible();
    await expect(page.getByLabel("Begründung")).toHaveValue("Alle Angaben sind vollständig und plausibel.");
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: null, status: "SUBMITTED" });
  });

  test("ein zweiter Entscheid zum selben Fall zeigt «bereits entschieden» mit dem neuen Stand", async ({ page, baseURL }) => {
    const { review } = await openCase(page, baseURL);
    // Jemand anderes entscheidet, während die Seite offen ist.
    await query(`update profile_review set decision = 'REJECTED', "decidedAt" = now(), reason = 'Fiktiv anderswo entschieden', rule = 'R-5' where id = $1`, [review.reviewId]);
    await decide(page, "Freigeben", "Alle Angaben sind vollständig und plausibel.");
    await save(page);
    await expect(page).toHaveURL(new RegExp(`${review.reviewId}\\?hinweis=entschieden$`));
    await expect(page.getByText("Dieser Fall wurde bereits entschieden")).toBeVisible();
    const readonly = page.locator("[data-decision-readonly]");
    await expect(readonly).toContainText("Abgelehnt");
    await expect(readonly).toContainText("Fiktiv anderswo entschieden");
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: "REJECTED", status: "SUBMITTED" });
  });

  test("unbekannte ID ergibt 404", async ({ page, baseURL }) => {
    const reviewer = await signInAdmin(page, baseURL, "SUPER_ADMIN");
    created.push(reviewer.id);
    const response = await page.goto("/de/admin/verifizierungen/gibt-es-nicht");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Diesen Fall gibt es nicht" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Bereiche des Admins" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });

  test("unter 1024 px nur lesend: Hinweis statt Formular; 320 px ohne Scrollen", async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await openCase(page, baseURL);
    await expect(page.locator("[data-decision-form]")).toBeHidden();
    await expect(page.getByText("Entscheiden geht ab 1024 px Breite")).toBeVisible();
    await expect(page.getByRole("button", { name: "Prüfdetails aufdecken" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.setViewportSize({ width: 320, height: 720 });
    await expect(page.getByText("Entscheiden geht ab 1024 px Breite")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.locator("[data-decision-form]")).toBeVisible();
    await expect(page.getByText("Entscheiden geht ab 1024 px Breite")).toBeHidden();
  });
});
